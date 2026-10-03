import { NextRequest, NextResponse } from "next/server"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"

// Minimal campaign tracking — a label a lead can point back to. No
// attribution math. Scope per LEAD_INTELLIGENCE_V2_PLAN.md item 11.

export async function GET() {
  const org = await getUserOrg()
  if (!org) return NextResponse.json({ error: "Authentication required" }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .eq("org_id", org.org_id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ campaigns: data ?? [] })
}

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  if (!isOrgAdmin(org.role)) {
    return NextResponse.json({ error: "Only an organisation admin can create campaigns" }, { status: 403 })
  }

  let body: { name?: string; channel?: string | null; status?: string; starts_at?: string | null; ends_at?: string | null }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  if (!name) return NextResponse.json({ error: "`name` is required" }, { status: 400 })

  if (body.status && !["active", "paused", "ended"].includes(body.status)) {
    return NextResponse.json({ error: "`status` must be one of active, paused, ended" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = await db
    .from("campaigns")
    .insert({
      org_id: org.org_id,
      name,
      channel: body.channel ?? null,
      status: body.status ?? "active",
      starts_at: body.starts_at ?? null,
      ends_at: body.ends_at ?? null,
    })
    .select("*")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, campaign: data })
}
