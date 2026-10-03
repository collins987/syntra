import { NextRequest, NextResponse } from "next/server"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"

// Manual assignment only — any org member can be assigned, no round-robin or
// auto-routing. Scope per LEAD_INTELLIGENCE_V2_PLAN.md item 10.

const ASSIGNMENT_STATUSES = ["unassigned", "assigned", "in_progress"] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const org = await getUserOrg()
  if (!org) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (!isOrgAdmin(org.role)) {
    return NextResponse.json({ error: "Only an organisation admin can assign leads" }, { status: 403 })
  }

  const { id } = await params

  let body: { assigned_to?: string | null; assignment_status?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const update: Record<string, unknown> = {}

  if (body.assignment_status !== undefined) {
    if (!ASSIGNMENT_STATUSES.includes(body.assignment_status as (typeof ASSIGNMENT_STATUSES)[number])) {
      return NextResponse.json(
        { error: "`assignment_status` must be one of unassigned, assigned, in_progress" },
        { status: 400 }
      )
    }
    update.assignment_status = body.assignment_status
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  if (body.assigned_to !== undefined) {
    if (body.assigned_to === null) {
      update.assigned_to = null
      if (update.assignment_status === undefined) update.assignment_status = "unassigned"
    } else {
      // The assignee must be a member of this lead's own org — no cross-org assignment.
      const { data: member } = await db
        .from("organization_members")
        .select("user_id")
        .eq("org_id", org.org_id)
        .eq("user_id", body.assigned_to)
        .maybeSingle()
      if (!member) {
        return NextResponse.json(
          { error: "Assignee must be a member of this organisation" },
          { status: 400 }
        )
      }
      update.assigned_to = body.assigned_to
      if (update.assignment_status === undefined) update.assignment_status = "assigned"
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  const { data, error } = await db
    .from("leads")
    .update(update)
    .eq("id", id)
    .eq("org_id", org.org_id)
    .select("id, assigned_to, assignment_status")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, lead: data })
}
