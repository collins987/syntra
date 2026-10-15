import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { generateClientInvite, resendClientInvite } from "@/lib/auth/invite"
import { sendClientInviteEmail } from "@/lib/email/templates/invite"
import { createServiceClient } from "@/lib/supabase/service"

interface InviteBody {
  email?: string
  full_name?: string
  phone?: string | null
  company_name?: string | null
}

/**
 * POST /api/auth/invite
 *
 * Admin-only. Creates a personal-account client (auth.users + profiles) and
 * sends the activation email. Idempotent on email: if an existing user has
 * the same email but their account is still pending with no active invite,
 * a fresh invite row is issued and resent; if there's already a live pending
 * invite, we refuse (409) so a double-click doesn't flood them.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  let body: InviteBody
  try {
    body = (await req.json()) as InviteBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ""
  const fullName = body.full_name?.trim() ?? ""

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 })
  }
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 })
  }

  // Try the fresh-invite path first. If the email is already in use for a
  // still-pending client, fall through to resending (treats the admin's
  // repeat click as "send them a new link", not an error).
  let result = await generateClientInvite({
    email,
    full_name: fullName,
    phone: body.phone ?? null,
    company_name: body.company_name ?? null,
    created_by: user.id,
  })

  if (!result.ok && result.reason === "email_in_use") {
    // Look up the existing pending profile and resend. If the account is
    // already active, refuse — this is an onboarding email, not a sign-in link.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = createServiceClient() as any
    const { data: existing } = (await svc
      .from("profiles")
      .select("id, status, full_name")
      .eq("email", email)
      .maybeSingle()) as {
      data: { id: string; status: string; full_name: string } | null
    }

    if (!existing) {
      return NextResponse.json({ error: result.message }, { status: 409 })
    }
    if (existing.status !== "pending") {
      return NextResponse.json(
        { error: "This client already has an active SYNTRA account." },
        { status: 409 },
      )
    }
    result = await resendClientInvite({
      user_id: existing.id,
      email,
      created_by: user.id,
    })
    if (result.ok) {
      // generateClientInvite would have used body.full_name on the first-time
      // path. On the resend path we re-use the existing profile's name so a
      // stale body typo doesn't rename the client.
      // (No-op here — the mail uses the full_name we pass; keep in sync below.)
    }
  }

  if (!result.ok) {
    const status = result.reason === "pending_invite_exists" ? 409 : 500
    return NextResponse.json({ error: result.message }, { status })
  }

  // Pull the profile's actual full_name so the email always matches what's
  // stored, not whatever the admin last typed into the form.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc2 = createServiceClient() as any
  const { data: profile } = (await svc2
    .from("profiles")
    .select("full_name")
    .eq("id", result.user_id)
    .single()) as { data: { full_name: string } | null }

  await sendClientInviteEmail({
    to: email,
    fullName: profile?.full_name ?? fullName,
    token: result.invite.token,
  })

  return NextResponse.json({
    ok: true,
    user_id: result.user_id,
    expires_at: result.invite.expires_at,
  })
}
