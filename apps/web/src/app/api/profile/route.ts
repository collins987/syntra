import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

interface PatchBody {
  full_name?: string
  phone?: string | null
  company_name?: string | null
  avatar_url?: string | null
}

/**
 * PATCH /api/profile
 *
 * Updates the signed-in personal-account client's own profile row. Email,
 * status, and id are intentionally not accepted here — those are
 * platform-controlled per migration 016's self-update trigger, which would
 * reject them anyway. We filter them in the route so the error surface stays
 * clean (clear 400 rather than a database exception).
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const fullName = body.full_name?.trim()
  if (fullName !== undefined && fullName.length === 0) {
    return NextResponse.json(
      { error: "Full name cannot be empty." },
      { status: 400 },
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const update: Record<string, unknown> = {}
  if (fullName !== undefined) update["full_name"] = fullName
  if (body.phone !== undefined) update["phone"] = body.phone
  if (body.company_name !== undefined) update["company_name"] = body.company_name
  if (body.avatar_url !== undefined) update["avatar_url"] = body.avatar_url

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true, changed: false })
  }

  const { error } = await db.from("profiles").update(update).eq("id", user.id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, changed: true })
}
