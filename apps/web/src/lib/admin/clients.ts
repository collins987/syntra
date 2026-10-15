import type {
  ClientInvite,
  ClientProject,
  ClientServiceKey,
  Profile,
  ProfileStatus,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"
import {
  generateClientInvite,
  resendClientInvite,
} from "@/lib/auth/invite"
import { sendClientInviteEmail } from "@/lib/email/templates/invite"
import {
  DEFAULT_SERVICES,
} from "@/lib/services/client-services"

// Supabase JS 2.47 Row inference doesn't flow through workspace Database
// types for mutations — same convention as lib/auth/invite.ts.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface ClientListRow {
  id: string
  full_name: string
  email: string
  company_name: string | null
  status: ProfileStatus
  created_at: string
  services: ClientServiceKey[]
  last_sign_in_at: string | null
  pending_invite: boolean
}

export interface ClientDetail {
  profile: Profile
  services: ClientServiceKey[]
  projects: ClientProject[]
  invite: ClientInvite | null
  last_sign_in_at: string | null
}

export interface CreateClientInput {
  full_name: string
  email: string
  phone?: string | null
  company_name?: string | null
  services?: ClientServiceKey[]
  created_by: string
}

export interface CreateClientResult {
  ok: boolean
  user_id?: string
  invite_sent?: boolean
  error?: string
}

/**
 * All personal-account clients, newest first. Joins profiles with their
 * client_services summary and latest pending invite flag. Admin-only.
 */
export async function listClients(): Promise<ClientListRow[]> {
  const db = createServiceClient() as AnyDb

  const [profilesRes, servicesRes, pendingInvitesRes] = (await Promise.all([
    db.from("profiles").select("*").order("created_at", { ascending: false }),
    db.from("client_services").select("user_id, service, active").eq("active", true),
    db
      .from("client_invites")
      .select("user_id")
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString()),
  ])) as [
    { data: Profile[] | null },
    { data: Array<{ user_id: string; service: ClientServiceKey; active: boolean }> | null },
    { data: Array<{ user_id: string }> | null },
  ]

  const profiles = profilesRes.data ?? []
  const services = servicesRes.data ?? []
  const pendingInvites = pendingInvitesRes.data ?? []

  const servicesByUser = new Map<string, ClientServiceKey[]>()
  for (const row of services) {
    const arr = servicesByUser.get(row.user_id) ?? []
    arr.push(row.service)
    servicesByUser.set(row.user_id, arr)
  }

  const pendingByUser = new Set(pendingInvites.map((r) => r.user_id))

  // last_sign_in_at lives in auth.users, not profiles. One admin API call —
  // Supabase paginates at ~1000 users, which is well beyond the number of
  // clients SYNTRA runs in the near term.
  const { data: authData } = await db.auth.admin.listUsers()
  const authUsers: Array<{ id: string; last_sign_in_at: string | null }> =
    authData?.users ?? []
  const lastSignInByUser = new Map<string, string | null>()
  for (const u of authUsers) lastSignInByUser.set(u.id, u.last_sign_in_at ?? null)

  return profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    company_name: p.company_name,
    status: p.status,
    created_at: p.created_at,
    services: servicesByUser.get(p.id) ?? [],
    last_sign_in_at: lastSignInByUser.get(p.id) ?? null,
    pending_invite: pendingByUser.has(p.id),
  }))
}

/**
 * One client's full picture: profile, active services, projects, and the
 * most recent still-pending invite if any. Returns null if the client doesn't
 * exist.
 */
export async function getClientDetail(id: string): Promise<ClientDetail | null> {
  const db = createServiceClient() as AnyDb

  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Profile | null }
  if (!profile) return null

  const [servicesRes, projectsRes, inviteRes, authUserRes] = (await Promise.all([
    db
      .from("client_services")
      .select("service, active")
      .eq("user_id", id)
      .eq("active", true),
    db
      .from("client_projects")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
    db
      .from("client_invites")
      .select("*")
      .eq("user_id", id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    db.auth.admin.getUserById(id),
  ])) as [
    { data: Array<{ service: ClientServiceKey; active: boolean }> | null },
    { data: ClientProject[] | null },
    { data: ClientInvite | null },
    { data: { user: { last_sign_in_at: string | null } | null } },
  ]

  return {
    profile,
    services: (servicesRes.data ?? []).map((r) => r.service),
    projects: projectsRes.data ?? [],
    invite: inviteRes.data ?? null,
    last_sign_in_at: authUserRes.data?.user?.last_sign_in_at ?? null,
  }
}

/**
 * Full onboarding flow: creates the auth user, profile, services, and fires
 * the invite email. All-or-nothing on the auth-user+profile pair; a failed
 * services write doesn't roll back the user (admin can retry via the detail
 * page, and the user still has a working account shell).
 */
export async function createClient(
  input: CreateClientInput,
): Promise<CreateClientResult> {
  const db = createServiceClient() as AnyDb
  const email = input.email.trim().toLowerCase()
  const services = input.services ?? DEFAULT_SERVICES

  const invite = await generateClientInvite({
    email,
    full_name: input.full_name.trim(),
    phone: input.phone ?? null,
    company_name: input.company_name ?? null,
    created_by: input.created_by,
  })

  if (!invite.ok) {
    return { ok: false, error: invite.message }
  }

  // Service rows. Done after the user is created — profile FK guarantees
  // the user exists. An insert collision on (user_id, service) would be a
  // retry case; onConflict silently keeps the earlier row.
  if (services.length > 0) {
    await db
      .from("client_services")
      .upsert(
        services.map((s) => ({
          user_id: invite.user_id,
          service: s,
          active: true,
        })),
        { onConflict: "user_id,service" },
      )
  }

  const emailResult = await sendClientInviteEmail({
    to: email,
    fullName: input.full_name.trim(),
    token: invite.invite.token,
  })

  return {
    ok: true,
    user_id: invite.user_id,
    invite_sent: emailResult.ok,
  }
}

/**
 * Resend an invite to a client whose previous link expired or was lost.
 * Fails if the client is already active (they should sign in or use the
 * password-reset flow, not another invite).
 */
export async function resendInvite(args: {
  user_id: string
  created_by: string
}): Promise<CreateClientResult> {
  const db = createServiceClient() as AnyDb
  const { data: profile } = (await db
    .from("profiles")
    .select("email, full_name, status")
    .eq("id", args.user_id)
    .maybeSingle()) as {
    data: { email: string; full_name: string; status: ProfileStatus } | null
  }

  if (!profile) return { ok: false, error: "Client not found." }
  if (profile.status !== "pending") {
    return { ok: false, error: "This client's account is already active." }
  }

  const result = await resendClientInvite({
    user_id: args.user_id,
    email: profile.email,
    created_by: args.created_by,
  })
  if (!result.ok) return { ok: false, error: result.message }

  const emailResult = await sendClientInviteEmail({
    to: profile.email,
    fullName: profile.full_name,
    token: result.invite.token,
  })

  return { ok: true, user_id: args.user_id, invite_sent: emailResult.ok }
}

export interface UpdateClientInput {
  full_name?: string
  phone?: string | null
  company_name?: string | null
  status?: ProfileStatus
  services?: Record<ClientServiceKey, boolean>
}

/**
 * Admin-side profile update. Status, email, and services bypass the
 * self-update trigger (service role). Services arrive as a {key: boolean}
 * map; keys not present are left as they are.
 */
export async function updateClient(
  id: string,
  input: UpdateClientInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb

  const profileUpdate: Record<string, unknown> = {}
  if (input.full_name !== undefined) profileUpdate["full_name"] = input.full_name.trim()
  if (input.phone !== undefined) profileUpdate["phone"] = input.phone
  if (input.company_name !== undefined) profileUpdate["company_name"] = input.company_name
  if (input.status !== undefined) profileUpdate["status"] = input.status

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await db.from("profiles").update(profileUpdate).eq("id", id)
    if (error) return { ok: false, error: error.message }
  }

  if (input.services) {
    const rows = Object.entries(input.services).map(([service, active]) => ({
      user_id: id,
      service: service as ClientServiceKey,
      active,
    }))
    const { error } = await db
      .from("client_services")
      .upsert(rows, { onConflict: "user_id,service" })
    if (error) return { ok: false, error: error.message }
  }

  return { ok: true }
}
