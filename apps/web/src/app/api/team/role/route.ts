import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"

export async function PATCH(req: NextRequest) {
  try {
    const { memberId, role } = (await req.json()) as { memberId?: string; role?: string }

    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 })
    if (!role || !["CLIENT_ADMIN", "CLIENT_USER"].includes(role)) {
      return NextResponse.json({ error: "role must be CLIENT_ADMIN or CLIENT_USER" }, { status: 400 })
    }

    const org = await getUserOrg()
    if (!org || org.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Only admins can change member roles" }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any

    // Confirm the membership row belongs to this org
    const { data: member } = (await db
      .from("organization_members")
      .select("id, user_id, role")
      .eq("id", memberId)
      .eq("org_id", org.org_id)
      .maybeSingle()) as { data: { id: string; user_id: string; role: string } | null }

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    if (member.user_id === user.id) {
      return NextResponse.json({ error: "You cannot change your own role." }, { status: 400 })
    }

    if (member.role === role) {
      return NextResponse.json({ ok: true })
    }

    await db
      .from("organization_members")
      .update({ role })
      .eq("id", memberId)
      .eq("org_id", org.org_id)

    await db.from("audit_logs").insert({
      org_id: org.org_id,
      user_id: user.id,
      action: "team.role_changed",
      resource_type: "organization_member",
      resource_id: memberId,
      metadata: { target_user_id: member.user_id, from_role: member.role, to_role: role },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update role"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
