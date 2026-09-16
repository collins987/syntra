import { createClient } from "@/lib/supabase/server"

// SYNTRA's own view of every workflow. The client never opens n8n — n8n is
// infrastructure, this is the product. See SYNTRA_BUILD_PLAN.md Stage 2.

export interface ManagedAutomation {
  id: string
  name: string
  workflowCode: string | null
  n8nWorkflowId: string | null
  status: string
  lastRunAt: string | null
  monthlyExecutions: number
  totalExecutions: number
  succeeded: number
  failed: number
  successRate: number | null
  avgDurationMs: number | null
  lastError: string | null
  lastErrorAt: string | null
  /** Failed on its most recent run and has not recovered. */
  needsAttention: boolean
}

export interface AutomationSummary {
  total: number
  active: number
  needingAttention: number
  executionsThisMonth: number
  overallSuccessRate: number | null
}

export interface AutomationsView {
  automations: ManagedAutomation[]
  summary: AutomationSummary
}

interface ExecutionRow {
  automation_id: string
  status: string
  started_at: string
  duration_ms: number | null
  error: string | null
}

export async function getManagedAutomations(orgId: string): Promise<AutomationsView> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [automationsRes, executionsRes] = await Promise.all([
    db
      .from("automations")
      .select("id, name, workflow_code, n8n_workflow_id, status, last_run_at, monthly_execution_count")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),

    db
      .from("workflow_executions")
      .select("automation_id, status, started_at, duration_ms, error")
      .eq("org_id", orgId)
      .order("started_at", { ascending: false })
      .limit(1000),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = automationsRes.data ?? []
  const executions: ExecutionRow[] = executionsRes.data ?? []

  const byAutomation = new Map<string, ExecutionRow[]>()
  for (const e of executions) {
    const list = byAutomation.get(e.automation_id)
    if (list) list.push(e)
    else byAutomation.set(e.automation_id, [e])
  }

  const automations: ManagedAutomation[] = rows.map((a) => {
    // Already ordered newest-first by the query.
    const runs = byAutomation.get(a.id) ?? []
    const finished = runs.filter((r) => r.status === "completed" || r.status === "failed")
    const succeeded = runs.filter((r) => r.status === "completed").length
    const failed = runs.filter((r) => r.status === "failed").length
    const durations = runs.map((r) => r.duration_ms).filter((d): d is number => d != null)
    const lastFailure = runs.find((r) => r.status === "failed")
    const mostRecent = runs[0]

    return {
      id: a.id,
      name: a.name,
      workflowCode: a.workflow_code ?? null,
      n8nWorkflowId: a.n8n_workflow_id ?? null,
      status: a.status,
      lastRunAt: a.last_run_at ?? mostRecent?.started_at ?? null,
      monthlyExecutions: a.monthly_execution_count ?? 0,
      totalExecutions: runs.length,
      succeeded,
      failed,
      successRate: finished.length ? Math.round((succeeded / finished.length) * 100) : null,
      avgDurationMs: durations.length
        ? Math.round(durations.reduce((x, y) => x + y, 0) / durations.length)
        : null,
      lastError: lastFailure?.error ?? null,
      lastErrorAt: lastFailure?.started_at ?? null,
      needsAttention: mostRecent?.status === "failed",
    }
  })

  const allFinished = executions.filter((e) => e.status === "completed" || e.status === "failed")

  return {
    automations,
    summary: {
      total: automations.length,
      active: automations.filter((a) => a.status === "active").length,
      needingAttention: automations.filter((a) => a.needsAttention).length,
      executionsThisMonth: automations.reduce((n, a) => n + a.monthlyExecutions, 0),
      overallSuccessRate: allFinished.length
        ? Math.round(
            (allFinished.filter((e) => e.status === "completed").length / allFinished.length) * 100
          )
        : null,
    },
  }
}
