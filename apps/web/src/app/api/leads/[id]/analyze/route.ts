import { NextRequest, NextResponse } from "next/server"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { executeAction } from "@/lib/actions/gateway"
import { createServiceClient } from "@/lib/supabase/service"
import { redactLeadForPrompt } from "@/lib/leads/redact"
import { hashAnalysisInput, ANALYSIS_VERSION } from "@/lib/ai/functions/input-hash"
import type { Lead } from "@syntra/db"

// Admin-only entry point for the ai.analyze_lead Action Gateway capability.
// Admins act via session cookies, not workflow tokens — so this route lives
// alongside the other cookie-authenticated admin endpoints
// (api/leads/[id]/route.ts, api/campaigns/route.ts) rather than extending
// the bearer-token /api/actions/[capability] dispatcher that n8n uses.
// Both paths converge through executeAction() so capability validation,
// idempotency, Sentry, cost and ai_requests logging are identical.
//
// Deterministic score/tier are untouched by every path reachable from
// here — the capability's execute() calls analyzeLead(), which writes only
// leads.ai_* columns (grep-asserted in qa/scripts/lead-ai-parser.ts).

const CAPABILITY = "ai.analyze_lead"

const STATUS_CODES: Record<string, number> = {
  success: 200,
  duplicate: 200,
  in_flight: 409,
  blocked: 403,
  failed: 502,
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!isOrgAdmin(org.role)) {
    return NextResponse.json(
      { error: "Only an organisation admin can run AI lead analysis" },
      { status: 403 }
    )
  }

  const { id: leadId } = await params

  let body: { force?: unknown } = {}
  try {
    body = (await req.json()) as typeof body
  } catch {
    // An empty body is fine — force defaults to false.
  }
  const force = body.force === true

  // Phase 1f-α — deterministic actor-free idempotency identity. Two admins
  // analyzing the same lead with the same input hash and the same analysis
  // version converge on the same key, so the Action Gateway's existing
  // UNIQUE(idempotency_key) in action_log serializes them to one real
  // provider call. Actor identity (org.userId) is deliberately NOT part of
  // the key — it goes into action_log.actor_ref as audit metadata.
  //
  // Compute `input_hash` from the current lead state here so the key is
  // formed from the state that was actually about to be analyzed. If the
  // lead cannot be read (unknown id, cross-org), fall through to the
  // capability's own invalid_lead rejection with a sentinel-based key that
  // is still deterministic across retries. force=true rotates the key so a
  // completed-success idempotency entry cannot block a deliberate re-run.
  const { idempotencyKey, inputHash } = await buildIdempotencyKey(org.org_id, leadId, force)

  const outcome = await executeAction({
    orgId: org.org_id,
    capability: CAPABILITY,
    // routeInputHash passed through so analyzeLead can confirm its own
    // fresh read of the lead hashes to the same value the route reserved
    // under. Divergence → stale_input before any provider call. See
    // Phase 1f-α review finding A.
    input: { leadId, force, routeInputHash: inputHash },
    actor: "human",
    actorRef: org.userId,
    idempotencyKey,
    // Phase 1f-γ1 — manual admin trigger. The event id is "manual" (not
    // "manual:userId") so two admins analyzing the same lead state
    // converge on the same operation identity. Actor identity lives in
    // ai_requests.actor_user_id for audit, never in the key.
    triggerSource: "manual",
    eventId: "manual",
  })

  return NextResponse.json(
    {
      status: outcome.status,
      ...(outcome.result ? { result: outcome.result } : {}),
      ...(outcome.error ? { error: outcome.error } : {}),
      ...(outcome.actionId ? { actionId: outcome.actionId } : {}),
    },
    { status: STATUS_CODES[outcome.status] ?? 500 }
  )
}

/** Builds the deterministic idempotency identity for a lead-analysis call.
 *  Shape: `ai.analyze_lead:v1:{leadId}:{inputHashOrSentinel}:{ANALYSIS_VERSION}`
 *  where force=true appends a nonce segment so a deliberate re-run bypasses
 *  the Action Gateway's duplicate-check (which otherwise would return the
 *  cached outcome from the prior same-key call). */
async function buildIdempotencyKey(
  orgId: string,
  leadId: string,
  force: boolean
): Promise<{ idempotencyKey: string; inputHash: string | null }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data: lead } = await db
    .from("leads")
    .select("id, email, name, company, source, interested_service, audit_answers, created_at")
    .eq("id", leadId)
    .eq("org_id", orgId)
    .maybeSingle()

  // null when the lead could not be read (unknown id, cross-org). The
  // capability's own re-read will then reject as invalid_lead, so the
  // key component still being deterministic across retries is fine.
  const inputHash = lead
    ? hashAnalysisInput(redactLeadForPrompt(lead as Lead), ANALYSIS_VERSION)
    : null

  const keyHashPart = inputHash ?? "nolead"
  const base = `ai.analyze_lead:v1:${leadId}:${keyHashPart}:${ANALYSIS_VERSION}`

  // force=true: rotate the key by appending a short time-bucket. Two
  // force-clicks within the same second collide (idempotent at the second
  // boundary); separated clicks produce new keys. This preserves
  // concurrency protection at the resolution the admin cares about —
  // "I want a fresh run now" — without using a random UUID.
  const idempotencyKey = force ? `${base}:force:${Math.floor(Date.now() / 1000)}` : base
  return { idempotencyKey, inputHash }
}
