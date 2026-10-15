import type {
  ClientSupportRequest,
  SupportPriority,
  SupportRequest,
  SupportStatus,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"
import {
  sendSupportAdminNotificationEmail,
  sendSupportReceivedEmail,
  sendSupportStatusUpdateEmail,
} from "@/lib/email/templates/support"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/** Columns the client is allowed to see. Admin-only context (`internal_note`)
 *  is intentionally omitted — see migration 019 for the policy rationale. */
const CLIENT_COLUMNS =
  "id, user_id, project_id, title, description, priority, status, response_note, resolved_at, created_at, updated_at"

const PRIORITIES = new Set<SupportPriority>(["low", "normal", "high", "urgent"])
const STATUSES = new Set<SupportStatus>(["open", "in_progress", "resolved", "closed"])

export function isValidPriority(p: string): p is SupportPriority {
  return PRIORITIES.has(p as SupportPriority)
}

export function isValidStatus(s: string): s is SupportStatus {
  return STATUSES.has(s as SupportStatus)
}

export interface CreateRequestInput {
  user_id: string
  title: string
  description: string
  priority?: SupportPriority
  project_id?: string | null
}

export interface CreateRequestOk {
  ok: true
  request: ClientSupportRequest
}

export interface CreateRequestFail {
  ok: false
  error: string
}

/**
 * Create a request on behalf of the signed-in client. Fires the client-ack
 * and admin-notification emails after the row is written; failed sends are
 * logged via sendEmail (never thrown) so a bad SMTP day doesn't lose the
 * request itself.
 */
export async function createSupportRequest(
  input: CreateRequestInput,
): Promise<CreateRequestOk | CreateRequestFail> {
  const title = input.title.trim()
  const description = input.description.trim()
  if (!title || !description) {
    return { ok: false, error: "Title and description are required." }
  }
  const priority = input.priority ?? "normal"
  if (!isValidPriority(priority)) {
    return { ok: false, error: "Invalid priority." }
  }

  const db = createServiceClient() as AnyDb

  const { data, error } = (await db
    .from("support_requests")
    .insert({
      user_id: input.user_id,
      project_id: input.project_id ?? null,
      title,
      description,
      priority,
      status: "open",
      response_note: null,
      internal_note: null,
      resolved_at: null,
    })
    .select(CLIENT_COLUMNS)
    .single()) as { data: ClientSupportRequest | null; error: { message: string } | null }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create request." }
  }

  // Dispatch emails. Loaded in parallel; both are best-effort — a failed
  // send is logged in email_logs and visible to the admin from the admin
  // panel in a later phase.
  const { data: profile } = (await db
    .from("profiles")
    .select("full_name, email")
    .eq("id", input.user_id)
    .maybeSingle()) as { data: { full_name: string; email: string } | null }

  if (profile) {
    await Promise.all([
      sendSupportReceivedEmail({
        to: profile.email,
        fullName: profile.full_name,
        title: data.title,
        priority: data.priority,
        requestId: data.id,
      }),
      sendSupportAdminNotificationEmail({
        clientName: profile.full_name,
        clientEmail: profile.email,
        title: data.title,
        description: data.description,
        priority: data.priority,
        requestId: data.id,
      }),
    ])
  }

  return { ok: true, request: data }
}

/** Lists all requests for one client, newest first. Client-safe projection. */
export async function listClientRequests(userId: string): Promise<ClientSupportRequest[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("support_requests")
    .select(CLIENT_COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })) as {
    data: ClientSupportRequest[] | null
  }
  return data ?? []
}

/** Reads one request. If `clientView` is true, strips the admin-only note. */
export async function getRequest(
  id: string,
  options: { clientView: boolean },
): Promise<SupportRequest | ClientSupportRequest | null> {
  const db = createServiceClient() as AnyDb
  const columns = options.clientView ? CLIENT_COLUMNS : "*"
  const { data } = (await db
    .from("support_requests")
    .select(columns)
    .eq("id", id)
    .maybeSingle()) as { data: SupportRequest | ClientSupportRequest | null }
  return data
}

/** Admin-only. Lists every request with the client's name/email baked in. */
export interface AdminRequestRow extends SupportRequest {
  client_full_name: string
  client_email: string
}

export async function listAllRequests(options?: {
  status?: SupportStatus
  priority?: SupportPriority
}): Promise<AdminRequestRow[]> {
  const db = createServiceClient() as AnyDb

  let query = db
    .from("support_requests")
    .select("*")
    .order("created_at", { ascending: false })
  if (options?.status) query = query.eq("status", options.status)
  if (options?.priority) query = query.eq("priority", options.priority)
  const { data } = (await query) as { data: SupportRequest[] | null }
  const requests = data ?? []
  if (requests.length === 0) return []

  const userIds = Array.from(new Set(requests.map((r) => r.user_id)))
  const { data: profiles } = (await db
    .from("profiles")
    .select("id, full_name, email")
    .in("id", userIds)) as {
    data: Array<{ id: string; full_name: string; email: string }> | null
  }

  const byUser = new Map((profiles ?? []).map((p) => [p.id, p]))
  return requests.map((r) => ({
    ...r,
    client_full_name: byUser.get(r.user_id)?.full_name ?? "Unknown",
    client_email: byUser.get(r.user_id)?.email ?? "",
  }))
}

export interface UpdateStatusInput {
  status: SupportStatus
  response_note?: string | null
  internal_note?: string | null
}

export interface UpdateStatusOk {
  ok: true
  request: SupportRequest
}

export interface UpdateStatusFail {
  ok: false
  error: string
}

/**
 * Admin status transition. Fires the matching client email when the status
 * flips to in_progress / resolved / closed; a note-only edit (no status
 * change) does not re-email the client — those updates go through the
 * `notes-only` branch of /api/support/[id] instead.
 */
export async function updateRequestStatus(
  id: string,
  input: UpdateStatusInput,
): Promise<UpdateStatusOk | UpdateStatusFail> {
  if (!isValidStatus(input.status)) {
    return { ok: false, error: "Invalid status." }
  }
  const db = createServiceClient() as AnyDb

  const { data: existing } = (await db
    .from("support_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: SupportRequest | null }
  if (!existing) return { ok: false, error: "Request not found." }

  const update: Record<string, unknown> = { status: input.status }
  if (input.response_note !== undefined) update["response_note"] = input.response_note
  if (input.internal_note !== undefined) update["internal_note"] = input.internal_note
  if (input.status === "resolved" && !existing.resolved_at) {
    update["resolved_at"] = new Date().toISOString()
  }
  if (input.status === "open" || input.status === "in_progress") {
    // Re-opening clears the resolution stamp so the admin UI's "resolved"
    // badge doesn't lie about where the thread currently is.
    update["resolved_at"] = null
  }

  const { data: updated, error } = (await db
    .from("support_requests")
    .update(update)
    .eq("id", id)
    .select("*")
    .single()) as { data: SupportRequest | null; error: { message: string } | null }

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Failed to update." }
  }

  // Email only on real transitions. open → open is a no-op.
  const statusChanged = updated.status !== existing.status
  const shouldEmail =
    statusChanged &&
    (updated.status === "in_progress" ||
      updated.status === "resolved" ||
      updated.status === "closed")

  if (shouldEmail) {
    const { data: profile } = (await db
      .from("profiles")
      .select("full_name, email")
      .eq("id", updated.user_id)
      .maybeSingle()) as { data: { full_name: string; email: string } | null }

    if (profile) {
      await sendSupportStatusUpdateEmail({
        to: profile.email,
        fullName: profile.full_name,
        title: updated.title,
        status: updated.status as "in_progress" | "resolved" | "closed",
        responseNote: updated.response_note,
        requestId: updated.id,
      })
    }
  }

  return { ok: true, request: updated }
}

/** Edit notes without changing status. Admin only. No email dispatched. */
export async function updateRequestNotes(
  id: string,
  input: { response_note?: string | null; internal_note?: string | null },
): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {}
  if (input.response_note !== undefined) update["response_note"] = input.response_note
  if (input.internal_note !== undefined) update["internal_note"] = input.internal_note
  if (Object.keys(update).length === 0) return { ok: true }

  const db = createServiceClient() as AnyDb
  const { error } = await db.from("support_requests").update(update).eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
