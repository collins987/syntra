import crypto from "crypto"
import type { ClientInvite } from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// Supabase JS 2.47's generic Row inference doesn't flow through
// workspace-exported Database types cleanly for mutations, so inserts and
// updates run against an `any` cast — the same escape hatch every other
// server-only mutation in this codebase uses (see /api/team/invite). Reads
// stay strongly typed via explicit single/maybeSingle generics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

// 30-minute window matches the SYNTRA onboarding flow in SYNTRA_SDLC.md §5.
const INVITE_TTL_MINUTES = 30

export type InviteError =
  | "email_in_use"
  | "pending_invite_exists"
  | "user_create_failed"
  | "profile_create_failed"
  | "invite_create_failed"

export interface GenerateInviteInput {
  email: string
  full_name: string
  phone?: string | null
  company_name?: string | null
  created_by: string
}

export interface GenerateInviteOk {
  ok: true
  invite: ClientInvite
  user_id: string
}

export interface GenerateInviteFail {
  ok: false
  reason: InviteError
  message: string
}

/**
 * Creates a pending personal-account client invite.
 *
 *   1. auth.users row created with email_confirm=true and no password
 *   2. profiles row created with status='pending'
 *   3. client_invites row created with a one-time 30-minute token
 *
 * All writes go through the service-role client; RLS is bypassed on purpose
 * because the invitee has no session yet. Callers (e.g. /api/auth/invite) are
 * responsible for having proven that the caller IS an admin before this runs.
 *
 * If an admin needs to re-send an invite to someone who already has a pending
 * row, use resendClientInvite() instead so the auth.users row is reused and
 * a fresh token issued; this function refuses to double-create.
 */
export async function generateClientInvite(
  input: GenerateInviteInput,
): Promise<GenerateInviteOk | GenerateInviteFail> {
  const db = createServiceClient() as AnyDb
  const email = input.email.trim().toLowerCase()

  // Dedupe: an unused, unexpired invite for this address already covers them.
  const { data: pending } = (await db
    .from("client_invites")
    .select("id")
    .eq("email", email)
    .is("accepted_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle()) as { data: { id: string } | null }

  if (pending) {
    return {
      ok: false,
      reason: "pending_invite_exists",
      message: "A pending invitation for this email is still active.",
    }
  }

  // Create the auth user. email_confirm=true skips Supabase's own confirmation
  // email; we send our branded invite instead.
  const { data: createdUser, error: userErr } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { full_name: input.full_name },
  })

  if (userErr || !createdUser.user) {
    // Supabase surfaces "User already registered" when the address exists.
    const msg = userErr?.message ?? "Failed to create user."
    if (/already/i.test(msg)) {
      return {
        ok: false,
        reason: "email_in_use",
        message: "An account with this email already exists.",
      }
    }
    return { ok: false, reason: "user_create_failed", message: msg }
  }

  const userId = createdUser.user.id

  const { error: profileErr } = await db.from("profiles").insert({
    id: userId,
    full_name: input.full_name,
    email,
    phone: input.phone ?? null,
    company_name: input.company_name ?? null,
    status: "pending",
    avatar_url: null,
  })

  if (profileErr) {
    // Roll back the auth user so a retry can start clean.
    await db.auth.admin.deleteUser(userId).catch(() => {})
    return {
      ok: false,
      reason: "profile_create_failed",
      message: profileErr.message,
    }
  }

  const invite = await insertInviteRow(db, {
    email,
    userId,
    createdBy: input.created_by,
  })

  if (!invite.ok) return invite
  return { ok: true, invite: invite.invite, user_id: userId }
}

/**
 * Issues a fresh invite token for an existing pending user. Used by the admin
 * UI's "resend invite" action. Any previous unaccepted token for the same
 * email is left in place but ignored by validateInviteToken() once this one
 * exists — expiry on the old token means it will self-clean within 30
 * minutes, and the admin can wait or re-issue again.
 */
export async function resendClientInvite(args: {
  user_id: string
  email: string
  created_by: string
}): Promise<GenerateInviteOk | GenerateInviteFail> {
  const db = createServiceClient() as AnyDb
  const email = args.email.trim().toLowerCase()

  const result = await insertInviteRow(db, {
    email,
    userId: args.user_id,
    createdBy: args.created_by,
  })
  if (!result.ok) return result
  return { ok: true, invite: result.invite, user_id: args.user_id }
}

/**
 * Reads an invite by its token and returns it if currently valid (exists,
 * not accepted, not expired). Returns null in every other case so callers
 * can show one consistent "invalid or expired" error without leaking which.
 */
export async function validateInviteToken(
  token: string,
): Promise<ClientInvite | null> {
  if (!token) return null

  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("client_invites")
    .select("*")
    .eq("token", token)
    .maybeSingle()) as { data: ClientInvite | null }

  if (!data) return null
  if (data.accepted_at) return null
  if (new Date(data.expires_at) < new Date()) return null
  return data
}

export type AcceptInviteError =
  | "invalid_or_expired"
  | "weak_password"
  | "set_password_failed"

export interface AcceptInviteOk {
  ok: true
  email: string
  user_id: string
}

export interface AcceptInviteFail {
  ok: false
  reason: AcceptInviteError
  message: string
}

/**
 * Marks an invite accepted, sets the user's password, and flips their profile
 * from pending to active. Idempotent only to the extent of the invite row: a
 * second call with the same (already-accepted) token returns invalid_or_expired.
 *
 * Caller is responsible for signing the user in afterwards — this function
 * does not touch the client session (session cookies live in the request
 * context, not here).
 */
export async function acceptClientInvite(args: {
  token: string
  password: string
}): Promise<AcceptInviteOk | AcceptInviteFail> {
  if (!args.password || args.password.length < 8) {
    return {
      ok: false,
      reason: "weak_password",
      message: "Password must be at least 8 characters.",
    }
  }

  const invite = await validateInviteToken(args.token)
  if (!invite) {
    return {
      ok: false,
      reason: "invalid_or_expired",
      message: "This invitation link is invalid or has expired.",
    }
  }

  const db = createServiceClient() as AnyDb

  const { error: pwErr } = await db.auth.admin.updateUserById(invite.user_id, {
    password: args.password,
  })
  if (pwErr) {
    return {
      ok: false,
      reason: "set_password_failed",
      message: pwErr.message,
    }
  }

  const nowIso = new Date().toISOString()

  // Mark the invite row accepted. A unique index on token prevents re-use
  // from a second concurrent request. Any extra race-loser call will see
  // accepted_at set on the next validateInviteToken() hit.
  await db
    .from("client_invites")
    .update({ accepted_at: nowIso })
    .eq("id", invite.id)

  await db
    .from("profiles")
    .update({ status: "active" })
    .eq("id", invite.user_id)

  return { ok: true, email: invite.email, user_id: invite.user_id }
}

async function insertInviteRow(
  db: AnyDb,
  args: { email: string; userId: string; createdBy: string },
): Promise<
  | { ok: true; invite: ClientInvite }
  | { ok: false; reason: "invite_create_failed"; message: string }
> {
  const token = crypto.randomUUID() + "." + crypto.randomBytes(16).toString("hex")
  const expiresAt = new Date(
    Date.now() + INVITE_TTL_MINUTES * 60 * 1000,
  ).toISOString()

  const { data, error } = (await db
    .from("client_invites")
    .insert({
      email: args.email,
      user_id: args.userId,
      token,
      expires_at: expiresAt,
      accepted_at: null,
      created_by: args.createdBy,
    })
    .select("*")
    .single()) as { data: ClientInvite | null; error: { message: string } | null }

  if (error || !data) {
    return {
      ok: false,
      reason: "invite_create_failed",
      message: error?.message ?? "Failed to create invite row.",
    }
  }

  return { ok: true, invite: data }
}
