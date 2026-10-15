import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  getRequest,
  updateRequestNotes,
} from "@/lib/support/requests"

interface PatchBody {
  response_note?: string | null
  internal_note?: string | null
}

/** GET /api/support/[id] — client reads own (client view) or admin reads any. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { id } = await params
  const admin = isPlatformAdmin(user)
  const request = await getRequest(id, { clientView: !admin })
  if (!request) return NextResponse.json({ error: "Not found." }, { status: 404 })

  // Clients can only see their own requests.
  if (!admin && request.user_id !== user.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
  return NextResponse.json({ request })
}

/** PATCH /api/support/[id] — admin updates notes (status goes through /status). */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const { id } = await params
  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const result = await updateRequestNotes(id, {
    ...(body.response_note !== undefined ? { response_note: body.response_note } : {}),
    ...(body.internal_note !== undefined ? { internal_note: body.internal_note } : {}),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
