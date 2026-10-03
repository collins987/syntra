import { readFileSync } from "fs"
import { resolve } from "path"
import { createServiceClient } from "@/lib/supabase/service"
import { completeStructured } from "@/lib/ai/gateway"
import { redactLeadForPrompt, formatRedactedLead } from "@/lib/leads/redact"
import { parseReasoning, MalformedResponseError } from "./parse-reasoning"
import { hashAnalysisInput, ANALYSIS_VERSION } from "./input-hash"
import type { Lead, AiConfidence } from "@syntra/db"

// AI Lead Intelligence orchestrator. The single public entry point for the
// feature. Contains ZERO provider-specific code — every provider interaction
// goes through completeStructured() in gateway.ts, which goes through the
// AIProvider abstraction. This file does not import @anthropic-ai/sdk (the
// no-restricted-imports lint rule in eslint.config.mjs enforces that for
// the whole codebase outside providers/anthropic.ts).
//
// This file is the ONLY code permitted to write leads.ai_*. It writes NONE
// of leads.score / leads.tier / leads.* non-AI fields. A grep-level
// assertion in the unit test confirms this.
//
// See AI_LEAD_INTELLIGENCE_PLAN.md for the full design; §F for the gateway
// integration contract; §G for the trigger/cache/idempotency rules; §I for
// the tenant isolation trace.

export const LEAD_ANALYSIS_FUNCTION_NAME = "lead.analyze"
export const LEAD_ANALYSIS_MODEL_DEFAULT = "haiku-4-5" // operator-level toggle; actual id resolved by getModel()

export type LeadAnalysisStatus =
  | "success"
  | "cached"
  | "budget_exhausted"
  | "rate_limited"
  | "provider_error"
  | "malformed_response"
  | "invalid_lead"
  | "cross_org"

export interface LeadAnalysisResult {
  status: LeadAnalysisStatus
  aiScore: number | null
  reasoning: string | null
  confidence: AiConfidence | null
  model: string | null
  analyzedAt: string | null
  analysisVersion: string
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
  error?: string
}

export interface LeadAnalysisRequest {
  orgId: string
  leadId: string
  force?: boolean
}

const EMPTY_USAGE = { inputTokens: 0, outputTokens: 0, costUsd: 0 }

/** Lazy-loaded prompt body — read once per process, since the file ships
 *  with the deployment and never changes at runtime. */
let cachedSystemPrompt: string | null = null
function loadSystemPrompt(): string {
  if (cachedSystemPrompt) return cachedSystemPrompt
  const path = resolve(process.cwd(), "src/lib/ai/prompts/lead-analysis.v1.md")
  cachedSystemPrompt = readFileSync(path, "utf8")
  return cachedSystemPrompt
}

/** The single public entry point. Phase 1b runs this via unit/integration
 *  tests only; the Action Gateway capability that exposes it to admins is
 *  Phase 1c, not implemented here. */
export async function analyzeLead(req: LeadAnalysisRequest): Promise<LeadAnalysisResult> {
  const { orgId, leadId, force = false } = req
  const base: Omit<LeadAnalysisResult, "status"> = {
    aiScore: null,
    reasoning: null,
    confidence: null,
    model: null,
    analyzedAt: null,
    analysisVersion: ANALYSIS_VERSION,
    usage: EMPTY_USAGE,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Enforcement #1: the lead must exist AND belong to the requested org.
  // A zero-row result is indistinguishable from "wrong org guessing" and
  // is reported as cross_org / invalid_lead at the capability layer.
  const { data: lead, error: readErr } = await db
    .from("leads")
    .select(
      "id, org_id, email, name, company, source, interested_service, audit_answers, " +
        "score, tier, created_at, " +
        "ai_score, ai_reasoning, ai_confidence, ai_analyzed_at, ai_model, " +
        "ai_analysis_version, ai_analysis_input_hash"
    )
    .eq("id", leadId)
    .eq("org_id", orgId)
    .maybeSingle()

  if (readErr) return { ...base, status: "provider_error", error: readErr.message }
  if (!lead) return { ...base, status: "invalid_lead", error: "Lead not found in this organization" }

  // The lead row we read is already org-scoped. We never pass raw `lead` into
  // the prompt — only the redactor's approved projection.
  const redacted = redactLeadForPrompt(lead as Lead)
  const inputHash = hashAnalysisInput(redacted, ANALYSIS_VERSION)

  // Cache check: identical input + version → short-circuit, return the
  // existing analysis without a provider call. force=true bypasses.
  if (!force && lead.ai_analysis_input_hash === inputHash && lead.ai_analyzed_at) {
    return {
      status: "cached",
      aiScore: lead.ai_score,
      reasoning: lead.ai_reasoning,
      confidence: lead.ai_confidence,
      model: lead.ai_model,
      analyzedAt: lead.ai_analyzed_at,
      analysisVersion: ANALYSIS_VERSION,
      usage: EMPTY_USAGE,
    }
  }

  // ── Model call ───────────────────────────────────────────────────────
  const system = loadSystemPrompt()
  const user = formatRedactedLead(redacted)

  const completion = await completeStructured({
    orgId,
    functionName: LEAD_ANALYSIS_FUNCTION_NAME,
    functionVersion: ANALYSIS_VERSION,
    system,
    user,
    maxOutputTokens: 600,
  })

  if (completion.status === "budget_exhausted") {
    return completion.error
      ? { ...base, status: "budget_exhausted", error: completion.error }
      : { ...base, status: "budget_exhausted" }
  }
  if (completion.status === "rate_limited") {
    return completion.error
      ? { ...base, status: "rate_limited", error: completion.error }
      : { ...base, status: "rate_limited" }
  }
  if (completion.status === "provider_error") {
    return completion.error
      ? { ...base, status: "provider_error", error: completion.error }
      : { ...base, status: "provider_error" }
  }

  // ── Parse ───────────────────────────────────────────────────────────
  let parsed
  try {
    parsed = parseReasoning(completion.text)
  } catch (err) {
    if (err instanceof MalformedResponseError) {
      return { ...base, status: "malformed_response", error: err.message, model: completion.model }
    }
    throw err
  }

  // ── Persist AI fields only ─────────────────────────────────────────
  // Any attempt to write score/tier here is a boundary violation and must
  // never be added. The field set is explicit (no spread) exactly to make
  // the invariant visually obvious in review and grep-assertable in tests.
  const now = new Date().toISOString()
  const persisted = {
    ai_score: parsed.score,
    ai_reasoning: completion.text, // persist the model's raw structured text verbatim
    ai_confidence: parsed.confidence,
    ai_analyzed_at: now,
    ai_model: completion.model,
    ai_analysis_version: ANALYSIS_VERSION,
    ai_analysis_input_hash: inputHash,
  }

  const { error: writeErr } = await db
    .from("leads")
    .update(persisted)
    .eq("id", leadId)
    .eq("org_id", orgId)

  if (writeErr) {
    // The AI call already succeeded and was charged to the org. Returning
    // provider_error here flags the write failure to the caller; the audit
    // trail is intact in ai_requests regardless.
    return { ...base, status: "provider_error", error: writeErr.message, model: completion.model }
  }

  return {
    status: "success",
    aiScore: parsed.score,
    reasoning: completion.text,
    confidence: parsed.confidence,
    model: completion.model,
    analyzedAt: now,
    analysisVersion: ANALYSIS_VERSION,
    usage: completion.usage,
  }
}
