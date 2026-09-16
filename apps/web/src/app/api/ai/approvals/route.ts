import { NextRequest, NextResponse } from "next/server"
import { canDecideApprovals, getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { executeApproval, type ApprovalFailure } from "@/lib/ai/gateway"

// Approve or reject a queued agent action. Only a client admin decides — see
// F-03_APPROVAL_AUTHORIZATION_PLAN.md. Approving runs it through the Action
// Gateway with the approval id as the idempotency key, so a double-click cannot
// send twice.

const FAILURE_STATUS: Record<ApprovalFailure, number> = {
  not_found: 404,
  decided: 409,
  expired: 409,
  blocked: 409,
  failed: 502,
}

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (!canDecideApprovals(org.role)) {
    return NextResponse.json(
      { error: "Only an organisation admin can approve or reject agent actions" },
      { status: 403 }
    )
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  if (decision === "reject") {
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
      .select("id, capability")
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) {
      return NextResponse.json({ error: "This request was already decided" }, { status: 409 })
    }

    await db.from("audit_logs").insert({
      org_id: org.org_id,
      user_id: org.userId,
      action: "approval.rejected",
      resource_type: "ai_approval",
      resource_id: approvalId,
      metadata: { capability: data.capability, ...(body.note ? { note: body.note } : {}) },
    })
    return NextResponse.json({ ok: true, status: "rejected" })
  }

  const result = await executeApproval({
    approvalId,
    orgId: org.org_id,
    userId: org.userId,
  })

  // The decision was made even if the action then failed, so that is audited too.
  if (result.ok || result.failure === "failed") {
    await db.from("audit_logs").insert({
      org_id: org.org_id,
      user_id: org.userId,
      action: "approval.approved",
      resource_type: "ai_approval",
      resource_id: approvalId,
      metadata: {
        execution: result.ok ? "succeeded" : "failed",
        ...(result.error ? { error: result.error } : {}),
      },
    })
  }

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error ?? "Could not run this action" },
      { status: FAILURE_STATUS[result.failure ?? "failed"] }
    )
  }
  return NextResponse.json({ ok: true, status: "approved" })
}
