import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  isValidStatus,
  updateRequestStatus,
} from "@/lib/support/requests"
import type { SupportStatus } from "@syntra/db"

interface Body {
  status?: SupportStatus
  response_note?: string | null
  internal_note?: string | null
}

/**
 * PATCH /api/support/[id]/status
 *
 * Admin-only status transition. Fires the matching client email when the
 * status flips to in_progress / resolved / closed (see lib/support/requests).
 * Optional response_note / internal_note update applies alongside the status
 * change in a single atomic PATCH so the email always carries the fresh note.
 */
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
  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.status || !isValidStatus(body.status)) {
    return NextResponse.json({ error: "Invalid status." }, { status: 400 })
  }

  const result = await updateRequestStatus(id, {
    status: body.status,
    ...(body.response_note !== undefined ? { response_note: body.response_note } : {}),
    ...(body.internal_note !== undefined ? { internal_note: body.internal_note } : {}),
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, request: result.request })
}
