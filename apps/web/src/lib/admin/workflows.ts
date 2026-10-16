import type {
  ClientWorkflow,
  ClientWorkflowStatus,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface AdminWorkflowRow extends ClientWorkflow {
  /** Count of clients the workflow is assigned to. */
  assigned_count: number
}

/** Full catalogue with per-row assignment count. */
export async function listWorkflows(): Promise<AdminWorkflowRow[]> {
  const db = createServiceClient() as AnyDb

  const [workflowsRes, assignmentsRes] = (await Promise.all([
    db.from("client_workflows").select("*").order("name", { ascending: true }),
    db.from("client_workflow_assignments").select("workflow_id"),
  ])) as [
    { data: ClientWorkflow[] | null },
    { data: Array<{ workflow_id: string }> | null },
  ]

  const workflows = workflowsRes.data ?? []
  const assignmentCount = new Map<string, number>()
  for (const row of assignmentsRes.data ?? []) {
    assignmentCount.set(row.workflow_id, (assignmentCount.get(row.workflow_id) ?? 0) + 1)
  }

  return workflows.map((w) => ({
    ...w,
    time_saved_minutes: Number(w.time_saved_minutes ?? 0),
    cost_saved_usd: Number(w.cost_saved_usd ?? 0),
    assigned_count: assignmentCount.get(w.id) ?? 0,
  }))
}

export interface CreateWorkflowInput {
  name: string
  description?: string | null
  n8n_workflow_id?: string | null
  status?: ClientWorkflowStatus
  time_saved_minutes?: number
  cost_saved_usd?: number
}

export async function createWorkflow(
  input: CreateWorkflowInput,
): Promise<{ ok: true; workflow: ClientWorkflow } | { ok: false; error: string }> {
  const name = input.name.trim()
  if (!name) return { ok: false, error: "Workflow name is required." }
  if (input.time_saved_minutes !== undefined && input.time_saved_minutes < 0) {
    return { ok: false, error: "time_saved_minutes must be non-negative." }
  }
  if (input.cost_saved_usd !== undefined && input.cost_saved_usd < 0) {
    return { ok: false, error: "cost_saved_usd must be non-negative." }
  }

  const db = createServiceClient() as AnyDb
  const { data, error } = (await db
    .from("client_workflows")
    .insert({
      name,
      description: input.description ?? null,
      n8n_workflow_id: input.n8n_workflow_id?.trim() || null,
      status: input.status ?? "active",
      time_saved_minutes: input.time_saved_minutes ?? 0,
      cost_saved_usd: input.cost_saved_usd ?? 0,
      last_run_at: null,
    })
    .select("*")
    .single()) as { data: ClientWorkflow | null; error: { message: string } | null }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to create workflow." }
  }
  return { ok: true, workflow: data }
}

export interface UpdateWorkflowInput {
  name?: string
  description?: string | null
  n8n_workflow_id?: string | null
  status?: ClientWorkflowStatus
  time_saved_minutes?: number
  cost_saved_usd?: number
  /** Set true to stamp last_run_at = now() alongside other updates. */
  mark_run?: boolean
}

export async function updateWorkflow(
  id: string,
  input: UpdateWorkflowInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const update: Record<string, unknown> = {}
  if (input.name !== undefined) update["name"] = input.name.trim()
  if (input.description !== undefined) update["description"] = input.description
  if (input.n8n_workflow_id !== undefined)
    update["n8n_workflow_id"] = input.n8n_workflow_id?.trim() || null
  if (input.status !== undefined) update["status"] = input.status
  if (input.time_saved_minutes !== undefined) {
    if (input.time_saved_minutes < 0)
      return { ok: false, error: "time_saved_minutes must be non-negative." }
    update["time_saved_minutes"] = input.time_saved_minutes
  }
  if (input.cost_saved_usd !== undefined) {
    if (input.cost_saved_usd < 0)
      return { ok: false, error: "cost_saved_usd must be non-negative." }
    update["cost_saved_usd"] = input.cost_saved_usd
  }
  if (input.mark_run) update["last_run_at"] = new Date().toISOString()

  if (Object.keys(update).length === 0) return { ok: true }

  const db = createServiceClient() as AnyDb
  const { error } = await db.from("client_workflows").update(update).eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function deleteWorkflow(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb
  const { error } = await db.from("client_workflows").delete().eq("id", id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function assignWorkflowToClient(args: {
  workflow_id: string
  user_id: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb
  const { error } = await db
    .from("client_workflow_assignments")
    .upsert(
      { workflow_id: args.workflow_id, user_id: args.user_id },
      { onConflict: "workflow_id,user_id" },
    )
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function unassignWorkflowFromClient(args: {
  workflow_id: string
  user_id: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = createServiceClient() as AnyDb
  const { error } = await db
    .from("client_workflow_assignments")
    .delete()
    .eq("workflow_id", args.workflow_id)
    .eq("user_id", args.user_id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/** List the user_ids currently assigned a given workflow. */
export async function getWorkflowAssignments(workflowId: string): Promise<string[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("client_workflow_assignments")
    .select("user_id")
    .eq("workflow_id", workflowId)) as { data: Array<{ user_id: string }> | null }
  return (data ?? []).map((r) => r.user_id)
}

/** List the workflow_ids currently assigned to one client. */
export async function getClientAssignments(userId: string): Promise<string[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("client_workflow_assignments")
    .select("workflow_id")
    .eq("user_id", userId)) as { data: Array<{ workflow_id: string }> | null }
  return (data ?? []).map((r) => r.workflow_id)
}
