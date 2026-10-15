import type {
  ClientProject,
  ClientProjectStatus,
  ClientProjectType,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface CreateProjectInput {
  user_id: string
  name: string
  type: ClientProjectType
  status?: ClientProjectStatus
  live_url?: string | null
  notes?: string | null
}

export async function createClientProject(
  input: CreateProjectInput,
): Promise<{ ok: true; project: ClientProject } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb

  const { data, error } = (await db
    .from("client_projects")
    .insert({
      user_id: input.user_id,
      name: input.name.trim(),
      type: input.type,
      status: input.status ?? "planning",
      live_url: input.live_url ?? null,
      notes: input.notes ?? null,
      last_deployed_at: null,
    })
    .select("*")
    .single()) as { data: ClientProject | null; error: { message: string } | null }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create project." }
  }
  return { ok: true, project: data }
}

export interface UpdateProjectInput {
  name?: string
  type?: ClientProjectType
  status?: ClientProjectStatus
  live_url?: string | null
  notes?: string | null
  /**
   * Pass true to stamp last_deployed_at = now(). Explicit null blanks it.
   * Omit to leave as-is — matters because flipping status to `live` without
   * a deploy marker would be misleading.
   */
  mark_deployed?: boolean
}

export async function updateClientProject(
  id: string,
  input: UpdateProjectInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb

  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update["name"] = input.name.trim()
  if (input.type !== undefined) update["type"] = input.type
  if (input.status !== undefined) update["status"] = input.status
  if (input.live_url !== undefined) update["live_url"] = input.live_url
  if (input.notes !== undefined) update["notes"] = input.notes
  if (input.mark_deployed) update["last_deployed_at"] = new Date().toISOString()

  if (Object.keys(update).length === 0) return { ok: true }

  const { error } = await db.from("client_projects").update(update).eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}
