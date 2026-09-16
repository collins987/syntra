import { NextRequest, NextResponse } from "next/server"
import { authenticateWorkflowToken, executeAction } from "@/lib/actions/gateway"

// The callback n8n uses to act on a client's behalf. n8n holds only a scoped
// workflow token — every credential stays here.
//
//   POST /api/actions/email.send
//   Authorization: Bearer syn_wf_...
//   Idempotency-Key: <execution_id>:<step>

const STATUS_CODES: Record<string, number> = {
  success: 200,
  duplicate: 200,
  in_flight: 409,
  blocked: 403,
  failed: 502,
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ capability: string }> }
) {
  const { capability } = await params

  const identity = await authenticateWorkflowToken(req.headers.get("authorization"))
  if (!identity) {
    return NextResponse.json(
      { error: "Invalid or revoked workflow token" },
      { status: 401 }
    )
  }

  if (!identity.capabilities.includes(capability)) {
    return NextResponse.json(
      { error: `This token is not granted "${capability}"` },
      { status: 403 }
    )
  }

  let input: unknown
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const idempotencyKey = req.headers.get("idempotency-key")
  if (!idempotencyKey) {
    return NextResponse.json(
      { error: "Idempotency-Key header is required so a retry cannot act twice" },
      { status: 400 }
    )
  }

  const outcome = await executeAction({
    orgId: identity.orgId,
    capability,
    input,
    actor: "workflow",
    actorRef: identity.tokenId,
    idempotencyKey,
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
