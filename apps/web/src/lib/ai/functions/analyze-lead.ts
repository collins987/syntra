import { readFileSync } from "fs"
import { resolve } from "path"
import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"
import { completeStructured } from "@/lib/ai/gateway"
import {
  redactLeadForPrompt,
  formatRedactedLead,
  snapshotPinFields,
  AI_PIN_SOURCES,
  type AiPinSnapshot,
} from "@/lib/leads/redact"
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
  | "stale_input"
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
  /** Hash the caller (HTTP route) computed from the lead's state at
   *  idempotency-reservation time. If present and this function's own
   *  fresh read hashes to a different value, the lead changed between
   *  reservation and execution — short-circuit to stale_input before
   *  any provider call. See Phase 1f-α review finding A. */
  routeInputHash?: string | null
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
  const { orgId, leadId, force = false, routeInputHash = null } = req
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

  // Phase 1f-α review finding A: idempotency identity must correspond to
  // the state actually about to be analyzed. The HTTP route computes an
  // inputHash at reservation time (T0); this function re-reads at a later
  // time (T6). If the lead's input-shaping columns changed in that window,
  // the gateway reserved under one hash but we would be analyzing a
  // different state — allowing a concurrent request with the *current*
  // hash to pass UNIQUE and call the provider in parallel. Short-circuit
  // to stale_input BEFORE any provider call. This is strictly in addition
  // to the S3 conditional UPDATE below, which catches lead changes that
  // happen between this check and the UPDATE.
  if (routeInputHash !== null && routeInputHash !== inputHash) {
    Sentry.captureMessage("ai_lead_analysis.stale_input", {
      level: "warning",
      tags: {
        ai_function: LEAD_ANALYSIS_FUNCTION_NAME,
        ai_version: ANALYSIS_VERSION,
        stale_at: "pre_provider_hash_mismatch",
      },
      extra: { orgId, leadId },
    })
    return { ...base, status: "stale_input" }
  }

  // Snapshot the exact nine attributes the redactor reads. The conditional
  // UPDATE below pins these to their current values, so a change to any one
  // of them during the provider call → UPDATE affects 0 rows → stale_input.
  // See lib/leads/redact.ts AI_PIN_SOURCES for the single source of truth.
  const pinSnapshot: AiPinSnapshot = snapshotPinFields(lead as Lead)

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
      // Observability: Sentry allow-list only (no model-output content,
      // no PII). parseFailureCategory is a coarse enum derived from the
      // error's class of complaint, kept small so dashboards aggregate.
      Sentry.captureException(new Error("ai_lead_analysis.parse_failed"), {
        tags: {
          ai_function: LEAD_ANALYSIS_FUNCTION_NAME,
          ai_version: ANALYSIS_VERSION,
          model: completion.model,
          parse_failure_category: categorizeParseFailure(err),
        },
        extra: {
          orgId,
          leadId,
          responseLengthChars: completion.text.length,
        },
      })
      return { ...base, status: "malformed_response", error: err.message, model: completion.model }
    }
    throw err
  }

  // ── Persist AI fields only (conditional on pinned snapshot) ──────────
  // S3 stale-input protection: UPDATE only if every attribute the redactor
  // read is still exactly what it was at snapshot time. 0 rows affected →
  // the lead changed mid-flight → stale_input (provider was charged; see
  // ai_requests.status for the honest accounting). Boundary invariant:
  // this UPDATE lists ai_* fields only. Any attempt to add score/tier
  // here is a boundary violation and is grep-asserted in qa:ai-lead-parser.
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

  let q = db.from("leads").update(persisted).eq("id", leadId).eq("org_id", orgId)
  for (const col of AI_PIN_SOURCES) {
    const snap = pinSnapshot[col]
    q = snap === null ? q.is(col, null) : q.eq(col, snap)
  }
  const { data: updated, error: writeErr } = await q.select("id").maybeSingle()

  if (writeErr) {
    // Provider succeeded and was charged; the DB UPDATE itself failed.
    // Sentry metadata is strictly structural — no row contents, no PII.
    Sentry.captureException(new Error("ai_lead_analysis.write_failed"), {
      tags: {
        ai_function: LEAD_ANALYSIS_FUNCTION_NAME,
        ai_version: ANALYSIS_VERSION,
        model: completion.model,
        pg_error_code: pgCodeOf(writeErr),
      },
      extra: { orgId, leadId },
    })
    return { ...base, status: "provider_error", error: writeErr.message, model: completion.model }
  }

  if (!updated) {
    // S3: zero rows affected means at least one of the nine pinned
    // attributes changed between the SELECT above and this UPDATE. The
    // analysis is honest for the input hash it ran against, but the
    // lead's current input hash is different, so persisting it would
    // overwrite with stale AI data.
    Sentry.captureMessage("ai_lead_analysis.stale_input", {
      level: "warning",
      tags: {
        ai_function: LEAD_ANALYSIS_FUNCTION_NAME,
        ai_version: ANALYSIS_VERSION,
        model: completion.model,
      },
      extra: { orgId, leadId },
    })
    return {
      ...base,
      status: "stale_input",
      model: completion.model,
      usage: completion.usage, // cost is real; carry it to the caller for honest UI
    }
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

// ── Sentry helpers ──────────────────────────────────────────────────────────
// Coarse enumeration of parser-failure classes, derived from the exception
// message's shape rather than its content. Enum size is intentionally small
// so Sentry's own facets group cleanly. Never includes the raw response.
function categorizeParseFailure(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/empty response/i.test(msg)) return "empty_response"
  if (/missing SUMMARY/i.test(msg)) return "missing_summary"
  if (/CONFIDENCE/i.test(msg)) return "invalid_confidence"
  if (/SCORE/i.test(msg)) return "invalid_score"
  if (/missing or empty/i.test(msg)) return "missing_block"
  if (/non-dash|starts with a non-dash/i.test(msg)) return "malformed_list"
  return "other"
}

/** First two chars of Postgres SQLSTATE (the error class), e.g. "23" for
 *  integrity-constraint violations. Safe to log; the full code is also safe
 *  but the class is what dashboards usually facet on. */
function pgCodeOf(err: unknown): string | null {
  if (!err || typeof err !== "object") return null
  const code = (err as { code?: unknown }).code
  return typeof code === "string" ? code : null
}
