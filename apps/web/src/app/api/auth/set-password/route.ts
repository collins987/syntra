import { NextRequest, NextResponse } from "next/server"

import { acceptClientInvite } from "@/lib/auth/invite"

interface SetPasswordBody {
  token?: string
  password?: string
}

/**
 * POST /api/auth/set-password
 *
 * Public (no session required). Exchanges a one-time client invite token for
 * a password: validates the token, sets the password on the user's auth row,
 * flips the profile to active, and marks the invite accepted.
 *
 * Returns the email on success so the client-side form can call
 * supabase.auth.signInWithPassword() to establish the session. We deliberately
 * don't attempt to issue a session cookie from this route — the invite flow is
 * ephemeral and the cookie belongs to the signed-in request context, not here.
 */
export async function POST(req: NextRequest) {
  let body: SetPasswordBody
  try {
    body = (await req.json()) as SetPasswordBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const token = body.token?.trim() ?? ""
  const password = body.password ?? ""

  if (!token) {
    return NextResponse.json({ error: "Missing invite token." }, { status: 400 })
  }

  const result = await acceptClientInvite({ token, password })

  if (!result.ok) {
    const status = result.reason === "invalid_or_expired" ? 410 : 400
    return NextResponse.json({ error: result.message }, { status })
  }

  return NextResponse.json({ ok: true, email: result.email })
}
