import type { AssignedClientWorkflow } from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface ClientWorkflowSummary {
  workflows: AssignedClientWorkflow[]
  total_time_saved_minutes: number
  total_cost_saved_usd: number
  active_count: number
  error_count: number
}

/**
 * Returns every workflow currently assigned to one client, plus the roll-up
 * totals the Automations page shows at the top of the grid. Service-role
 * read so one query runs regardless of client state — the client view is
 * built from an unambiguous server source rather than two chained RLS reads.
 */
export async function getClientWorkflows(
  userId: string,
): Promise<ClientWorkflowSummary> {
  const db = createServiceClient() as AnyDb

  const { data: assignments } = (await db
    .from("client_workflow_assignments")
    .select("id, workflow_id, created_at")
    .eq("user_id", userId)) as {
    data: Array<{ id: string; workflow_id: string; created_at: string }> | null
  }

  const assignmentRows = assignments ?? []
  if (assignmentRows.length === 0) {
    return {
      workflows: [],
      total_time_saved_minutes: 0,
      total_cost_saved_usd: 0,
      active_count: 0,
      error_count: 0,
    }
  }

  const workflowIds = assignmentRows.map((a) => a.workflow_id)
  const { data: workflows } = (await db
    .from("client_workflows")
    .select("*")
    .in("id", workflowIds)
    .order("name", { ascending: true })) as {
    data: AssignedClientWorkflow[] | null
  }

  const assignmentByWorkflow = new Map(
    assignmentRows.map((a) => [a.workflow_id, a]),
  )
  const merged: AssignedClientWorkflow[] = (workflows ?? []).map((w) => {
    const assignment = assignmentByWorkflow.get(w.id)
    return {
      ...w,
      // cast cost from numeric string if Supabase returned it that way
      cost_saved_usd: Number(w.cost_saved_usd ?? 0),
      time_saved_minutes: Number(w.time_saved_minutes ?? 0),
      assignment_id: assignment?.id ?? "",
      assigned_at: assignment?.created_at ?? w.created_at,
    }
  })

  const totals = merged.reduce(
    (acc, w) => {
      acc.time += w.time_saved_minutes
      acc.cost += w.cost_saved_usd
      if (w.status === "active") acc.active += 1
      if (w.status === "error") acc.errors += 1
      return acc
    },
    { time: 0, cost: 0, active: 0, errors: 0 },
  )

  return {
    workflows: merged,
    total_time_saved_minutes: totals.time,
    total_cost_saved_usd: totals.cost,
    active_count: totals.active,
    error_count: totals.errors,
  }
}
