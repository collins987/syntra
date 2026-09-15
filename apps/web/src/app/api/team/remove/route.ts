import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"

export async function DELETE(req: NextRequest) {
  try {
    const { memberId } = (await req.json()) as { memberId?: string }
    if (!memberId) return NextResponse.json({ error: "memberId required" }, { status: 400 })

    const org = await getUserOrg()
    if (!org || org.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Only admins can remove members" }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any

    // Verify membership belongs to this org before deleting
    const { data: member } = (await db
      .from("organization_members")
      .select("id, user_id")
      .eq("id", memberId)
      .eq("org_id", org.org_id)
      .maybeSingle()) as { data: { id: string; user_id: string } | null }

    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 })

    if (member.user_id === user.id) {
      return NextResponse.json({ error: "You cannot remove yourself." }, { status: 400 })
    }

    await db.from("organization_members").delete().eq("id", memberId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to remove member"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
