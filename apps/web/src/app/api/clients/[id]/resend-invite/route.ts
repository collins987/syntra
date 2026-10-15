import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { resendInvite } from "@/lib/admin/clients"

/** POST /api/clients/[id]/resend-invite — admin-only. */
export async function POST(
  _req: NextRequest,
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
  const result = await resendInvite({ user_id: id, created_by: user.id })
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to resend." }, { status: 400 })
  }
  return NextResponse.json({ ok: true, invite_sent: result.invite_sent ?? false })
}
