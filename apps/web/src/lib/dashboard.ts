import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import type { Automation, WorkflowExecutionStatus } from "@syntra/db"

export const DASHBOARD_PERIODS = [7, 30, 90] as const
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number]
export const DEFAULT_PERIOD: DashboardPeriod = 30

export function isDashboardPeriod(value: unknown): value is DashboardPeriod {
  return DASHBOARD_PERIODS.includes(Number(value) as DashboardPeriod)
}

export interface SparkPoint {
  v: number
}

/** A dated point for the performance chart. */
export interface SeriesPoint {
  /** ISO date (yyyy-mm-dd) — the client formats it for display. */
  date: string
  v: number
}

export interface Metric {
  current: number
  previous: number
  /**
   * null when there is nothing to compare against. A change from zero has no
   * meaningful percentage — "+100%" on a first-ever lead is a fiction, and
   * this dashboard shows a client their own business.
   */
  changePct: number | null
}

export interface DashboardMetrics {
  leads: Metric
  qualifiedLeads: Metric
  aiTokens: Metric
  revenueCents: Metric
  currency: string
  /** Current state, not a flow — deliberately has no period delta. */
  activeAutomations: number
  totalAutomations: number
  /** null when the org has no finished executions yet — render "—", not "0%" */
  successRate: number | null
}

export interface DashboardSeries {
  leads: SeriesPoint[]
  revenue: SeriesPoint[]
  aiTokens: SeriesPoint[]
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
  period: DashboardPeriod
  metrics: DashboardMetrics
  series: DashboardSeries
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
  { id: "ava", initial: "A", name: "Ava", role: "Website & Content", match: ["ava", "content", "seo", "site"] },
  { id: "max", initial: "M", name: "Max", role: "Workflow & Operations", match: ["max", "workflow", "ops", "automation"] },
  { id: "leo", initial: "L", name: "Leo", role: "Business Intelligence", match: ["leo", "data", "report", "forecast"] },
] as const

function startOfDay(d: Date): Date {
  const copy = new Date(d)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const DAY_MS = 86_400_000

/** Buckets rows into dated per-day counts (or summed values) for the last N days. */
function bucketByDay<T extends { created_at: string }>(
  rows: T[],
  days: number,
  valueOf: (row: T) => number = () => 1
): SeriesPoint[] {
  const buckets = new Array<number>(days).fill(0)
  const todayStart = startOfDay(new Date()).getTime()

  for (const row of rows) {
    const rowDay = startOfDay(new Date(row.created_at)).getTime()
    const daysAgo = Math.round((todayStart - rowDay) / DAY_MS)
    if (daysAgo >= 0 && daysAgo < days) {
      const idx = days - 1 - daysAgo
      buckets[idx] = (buckets[idx] ?? 0) + valueOf(row)
    }
  }

  return buckets.map((v, i) => ({
    date: new Date(todayStart - (days - 1 - i) * DAY_MS).toISOString().slice(0, 10),
    v,
  }))
}

function metric(current: number, previous: number): Metric {
  return {
    current,
    previous,
    changePct: previous > 0 ? ((current - previous) / previous) * 100 : null,
  }
}

/** Sums rows whose created_at falls inside [from, to). */
function sumBetween<T extends { created_at: string }>(
  rows: T[],
  from: number,
  to: number,
  valueOf: (row: T) => number = () => 1
): number {
  let total = 0
  for (const row of rows) {
    const t = new Date(row.created_at).getTime()
    if (t >= from && t < to) total += valueOf(row)
  }
  return total
}

/** Leads that have progressed past first contact. Converted counts too — it
 *  cannot have got there without qualifying first. */
const QUALIFIED_STATUSES = new Set(["qualified", "converted"])

export async function getDashboardData(
  period: DashboardPeriod = DEFAULT_PERIOD
): Promise<DashboardData | null> {
  const org = await getUserOrg()
  if (!org) return null

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Two windows are fetched in one pass: the period on show, and the one
  // before it, which is what every "vs. previous" figure is measured against.
  const now = Date.now()
  const periodStart = now - period * DAY_MS
  const previousStart = now - period * 2 * DAY_MS
  const sinceIso = new Date(previousStart).toISOString()

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
      .select("id, function_name, status, input_tokens, output_tokens, created_at")
      .eq("org_id", org.org_id)
      .gte("created_at", sinceIso),

    db.from("leads").select("id, status, created_at").eq("org_id", org.org_id)
      .gte("created_at", sinceIso),

    db.from("invoices")
      .select("id, amount_cents, currency, status, created_at")
      .eq("org_id", org.org_id)
      .eq("status", "paid")
      .gte("created_at", sinceIso),
  ])) as [
    { data: Automation[] | null },
    { data: Array<{ id: string; automation_id: string; status: WorkflowExecutionStatus; started_at: string; duration_ms: number | null; error: string | null }> | null },
    { data: Array<{ id: string; function_name: string; status: string; input_tokens: number | null; output_tokens: number | null; created_at: string }> | null },
    { data: Array<{ id: string; status: string; created_at: string }> | null },
    { data: Array<{ id: string; amount_cents: number; currency: string; status: string; created_at: string }> | null },
  ]

  const automations = automationsRes.data ?? []
  const executions = executionsRes.data ?? []
  const aiRequests = aiRequestsRes.data ?? []
  const leads = leadsRes.data ?? []
  const invoices = invoicesRes.data ?? []

  // ── Metrics ────────────────────────────────────────────────────────────────
  const finished = executions.filter((e) => e.status === "completed" || e.status === "failed")
  const successRate = finished.length
    ? (finished.filter((e) => e.status === "completed").length / finished.length) * 100
    : null

  const qualified = leads.filter((l) => QUALIFIED_STATUSES.has(l.status))
  const tokensOf = (r: { input_tokens: number | null; output_tokens: number | null }) =>
    (r.input_tokens ?? 0) + (r.output_tokens ?? 0)
  const centsOf = (i: { amount_cents: number }) => i.amount_cents ?? 0

  const metrics: DashboardMetrics = {
    leads: metric(
      sumBetween(leads, periodStart, now),
      sumBetween(leads, previousStart, periodStart)
    ),
    qualifiedLeads: metric(
      sumBetween(qualified, periodStart, now),
      sumBetween(qualified, previousStart, periodStart)
    ),
    aiTokens: metric(
      sumBetween(aiRequests, periodStart, now, tokensOf),
      sumBetween(aiRequests, previousStart, periodStart, tokensOf)
    ),
    revenueCents: metric(
      sumBetween(invoices, periodStart, now, centsOf),
      sumBetween(invoices, previousStart, periodStart, centsOf)
    ),
    currency: invoices[0]?.currency ?? "usd",
    activeAutomations: automations.filter((a) => a.status === "active").length,
    totalAutomations: automations.length,
    successRate,
  }

  // ── Chart series ───────────────────────────────────────────────────────────
  const series: DashboardSeries = {
    leads: bucketByDay(leads, period),
    revenue: bucketByDay(invoices, period, (i) => i.amount_cents / 100),
    aiTokens: bucketByDay(aiRequests, period, tokensOf),
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
    period,
    metrics,
    series,
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
