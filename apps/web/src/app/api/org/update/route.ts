import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"

export async function PATCH(req: NextRequest) {
  try {
    const { name } = (await req.json()) as { name?: string }
    if (!name?.trim()) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    const org = await getUserOrg()
    if (!org || org.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Only admins can update organization settings" }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any

    // Read the old name first: "renamed to X" is far less use when investigating
    // than "renamed from X to Y".
    const { data: before } = (await db
      .from("organizations")
      .select("name")
      .eq("id", org.org_id)
      .maybeSingle()) as { data: { name: string } | null }

    const { error } = await db
      .from("organizations")
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq("id", org.org_id)

    if (error) throw error

    await db.from("audit_logs").insert({
      org_id: org.org_id,
      user_id: org.userId,
      action: "org.updated",
      resource_type: "organization",
      resource_id: org.org_id,
      metadata: { from: before?.name ?? null, to: name.trim() },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update organization"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
