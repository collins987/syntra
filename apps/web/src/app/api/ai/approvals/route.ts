import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { executeApproval } from "@/lib/ai/gateway"

// Approve or reject a queued agent action. Approving runs it through the Action
// Gateway with the approval id as the idempotency key, so a double-click cannot
// send twice.

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  let body: { approvalId?: string; decision?: string; note?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const { approvalId, decision } = body
  if (!approvalId) {
    return NextResponse.json({ error: "approvalId is required" }, { status: 400 })
  }
  if (decision !== "approve" && decision !== "reject") {
    return NextResponse.json({ error: "decision must be approve or reject" }, { status: 400 })
  }

  if (decision === "reject") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const { data, error } = await db
      .from("ai_approvals")
      .update({
        status: "rejected",
        decided_by: org.userId,
        decided_at: new Date().toISOString(),
        decision_note: body.note ?? null,
      })
      .eq("id", approvalId)
      .eq("org_id", org.org_id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json({ error: "This request was already decided" }, { status: 409 })
    }
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  const result = await executeApproval({
    approvalId,
    orgId: org.org_id,
    userId: org.userId,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Could not run this action" }, { status: 400 })
  }
  return NextResponse.json({ ok: true, status: "approved" })
}
