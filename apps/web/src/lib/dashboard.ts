import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import type { Automation, WorkflowExecutionStatus } from "@syntra/db"

const SPARK_DAYS = 10

export interface SparkPoint {
  v: number
}

export interface DashboardStats {
  activeAutomations: number
  totalAutomations: number
  /** null when the org has no executions yet — render as "—", not "0%" */
  successRate: number | null
  aiTasksToday: number
  totalLeads: number
  revenueCents: number
  currency: string
}

export interface DashboardSparklines {
  aiTasks: SparkPoint[]
  leads: SparkPoint[]
  revenue: SparkPoint[]
}

export interface ActivityRow {
  id: string
  automationName: string
  workflowCode: string | null
  status: WorkflowExecutionStatus
  startedAt: string
  durationMs: number | null
  error: string | null
}

export interface AgentStat {
  id: string
  initial: string
  name: string
  role: string
  tasks: number
  successRate: number | null
  lastActivity: string | null
}

export interface DashboardData {
  orgId: string
  stats: DashboardStats
  sparklines: DashboardSparklines
  activity: ActivityRow[]
  agents: AgentStat[]
  automations: Automation[]
  hasAnyData: boolean
}

/**
 * Agent identity is fixed (they are SYNTRA's named agents), but their stats
 * come from ai_requests. function_name is matched against these prefixes.
 */
const AGENTS = [
  { id: "ava", initial: "A", name: "Ava", role: "Content & SEO", match: ["content", "seo", "marketing", "copy", "blog"] },
  { id: "max", initial: "M", name: "Max", role: "Sales & Leads", match: ["lead", "sales", "outreach", "qualify", "crm"] },
  { id: "leo", initial: "L", name: "Leo", role: "Operations", match: ["ops", "workflow", "automation", "support", "triage"] },
] as const

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

/** Buckets rows into per-day counts (or summed values) for the last N days. */
function bucketByDay<T extends { created_at: string }>(
  rows: T[],
  days: number,
  valueOf: (row: T) => number = () => 1
): SparkPoint[] {
  const buckets = new Array<number>(days).fill(0)
  const todayStart = startOfDay(new Date()).getTime()
  const dayMs = 86_400_000

  for (const row of rows) {
    const rowDay = startOfDay(new Date(row.created_at)).getTime()
    const daysAgo = Math.round((todayStart - rowDay) / dayMs)
    if (daysAgo >= 0 && daysAgo < days) {
      const idx = days - 1 - daysAgo
      buckets[idx] = (buckets[idx] ?? 0) + valueOf(row)
    }
  }

  return buckets.map((v) => ({ v }))
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const org = await getUserOrg()
  if (!org) return null

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const sinceSpark = new Date(Date.now() - SPARK_DAYS * 86_400_000).toISOString()
  const todayStart = startOfDay(new Date()).toISOString()

  const [
    automationsRes,
    executionsRes,
    aiRequestsRes,
    leadsRes,
    invoicesRes,
  ] = (await Promise.all([
    db.from("automations").select("*").eq("org_id", org.org_id)
      .order("created_at", { ascending: false }),

    db.from("workflow_executions")
      .select("id, automation_id, status, started_at, duration_ms, error")
      .eq("org_id", org.org_id)
      .order("started_at", { ascending: false })
      .limit(200),

    db.from("ai_requests")
      .select("id, function_name, status, created_at")
      .eq("org_id", org.org_id)
      .gte("created_at", sinceSpark),

    db.from("leads").select("id, created_at").eq("org_id", org.org_id),

    db.from("invoices")
      .select("id, amount_cents, currency, status, created_at")
      .eq("org_id", org.org_id)
      .eq("status", "paid"),
  ])) as [
    { data: Automation[] | null },
    { data: Array<{ id: string; automation_id: string; status: WorkflowExecutionStatus; started_at: string; duration_ms: number | null; error: string | null }> | null },
    { data: Array<{ id: string; function_name: string; status: string; created_at: string }> | null },
    { data: Array<{ id: string; created_at: string }> | null },
    { data: Array<{ id: string; amount_cents: number; currency: string; status: string; created_at: string }> | null },
  ]

  const automations = automationsRes.data ?? []
  const executions = executionsRes.data ?? []
  const aiRequests = aiRequestsRes.data ?? []
  const leads = leadsRes.data ?? []
  const invoices = invoicesRes.data ?? []

  // ── Stats ──────────────────────────────────────────────────────────────────
  const finished = executions.filter((e) => e.status === "completed" || e.status === "failed")
  const successRate = finished.length
    ? (finished.filter((e) => e.status === "completed").length / finished.length) * 100
    : null

  const stats: DashboardStats = {
    activeAutomations: automations.filter((a) => a.status === "active").length,
    totalAutomations: automations.length,
    successRate,
    aiTasksToday: aiRequests.filter((r) => r.created_at >= todayStart).length,
    totalLeads: leads.length,
    revenueCents: invoices.reduce((sum, i) => sum + (i.amount_cents ?? 0), 0),
    currency: invoices[0]?.currency ?? "usd",
  }

  // ── Sparklines ─────────────────────────────────────────────────────────────
  const sparklines: DashboardSparklines = {
    aiTasks: bucketByDay(aiRequests, SPARK_DAYS),
    leads: bucketByDay(leads, SPARK_DAYS),
    revenue: bucketByDay(invoices, SPARK_DAYS, (i) => i.amount_cents / 100),
  }

  // ── Activity feed ──────────────────────────────────────────────────────────
  const automationById = new Map(automations.map((a) => [a.id, a]))
  const activity: ActivityRow[] = executions.slice(0, 30).map((e) => {
    const auto = automationById.get(e.automation_id)
    return {
      id: e.id,
      automationName: auto?.name ?? "Unknown automation",
      workflowCode: auto?.workflow_code ?? null,
      status: e.status,
      startedAt: e.started_at,
      durationMs: e.duration_ms,
      error: e.error,
    }
  })

  // ── Agent stats ────────────────────────────────────────────────────────────
  const agents: AgentStat[] = AGENTS.map((agent) => {
    const mine = aiRequests.filter((r) => {
      const fn = (r.function_name ?? "").toLowerCase()
      return agent.match.some((m) => fn.includes(m))
    })
    const done = mine.filter((r) => r.status === "success" || r.status === "completed")
    return {
      id: agent.id,
      initial: agent.initial,
      name: agent.name,
      role: agent.role,
      tasks: mine.length,
      successRate: mine.length ? (done.length / mine.length) * 100 : null,
      lastActivity: mine[0]?.created_at ?? null,
    }
  })

  return {
    orgId: org.org_id,
    stats,
    sparklines,
    activity,
    agents,
    automations,
    hasAnyData:
      automations.length > 0 ||
      executions.length > 0 ||
      leads.length > 0 ||
      aiRequests.length > 0,
  }
}
