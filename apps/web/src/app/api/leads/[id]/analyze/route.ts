import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { executeAction } from "@/lib/actions/gateway"

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

  const outcome = await executeAction({
    orgId: org.org_id,
    capability: CAPABILITY,
    input: { leadId, force },
    actor: "human",
    actorRef: org.userId,
    // analyzeLead has its own content-aware cache (ai_analysis_input_hash);
    // the gateway's idempotency layer is an orthogonal "did we already run
    // this exact request?" guard. A fresh key per request keeps the two
    // layers independent and avoids the gateway shadow-caching a stale
    // outcome if the input hash later invalidates.
    idempotencyKey: `ai.analyze_lead:${leadId}:${randomUUID()}`,
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
