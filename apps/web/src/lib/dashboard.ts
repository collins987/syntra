import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import type { Automation, WorkflowExecutionStatus } from "@syntra/db"
import { DEFAULT_PERIOD, type DashboardPeriod } from "./dashboard-periods"
import { isOsPlan } from "@/lib/pricing"

// Re-exported for server components (this file touches next/headers via
// lib/supabase/server, so it can only ever run server-side). A "use client"
// component must import period constants from ./dashboard-periods directly,
// never from here — importing even one value from this module pulls its
// entire graph, next/headers included, into the client bundle and fails the
// production build. tsc and next lint both miss this; only next build catches
// it. See period-picker.tsx.
export { DASHBOARD_PERIODS, DEFAULT_PERIOD, isDashboardPeriod } from "./dashboard-periods"
export type { DashboardPeriod } from "./dashboard-periods"

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

/**
 * One row per product in the sidebar's Services group. Deliberately data,
 * not display copy — icon choice, wording and the "Live" badge threshold
 * belong to the component, not this file.
 */
export interface ServiceOverview {
  sites: { total: number; live: number }
  flow: { total: number; active: number; successRate: number | null }
  /** Real lead volume for the period — Growth's own attract-stage metric. */
  growth: { leads: number }
  leadIntelligence: { total: number }
  aiAgents: { total: number; activeTasks: number }
  os: { active: boolean }
}

export interface RecentLead {
  id: string
  name: string | null
  company: string | null
  score: number
  tier: string | null
  status: string
  source: string | null
  createdAt: string
}

export interface ModelCost {
  model: string
  costUsd: number
}

export interface AiCostSummary {
  /** Current period only, sorted highest spend first. */
  byModel: ModelCost[]
  totalCostUsd: number
  /** null when no budget row exists yet — render "Not set", not "$0 / $0". */
  budget: { limitUsd: number; spentUsd: number; alertAtPercent: number } | null
}

export interface DashboardData {
  orgId: string
  period: DashboardPeriod
  metrics: DashboardMetrics
  series: DashboardSeries
  activity: ActivityRow[]
  agents: AgentStat[]
  automations: Automation[]
  services: ServiceOverview
  recentLeads: RecentLead[]
  aiCost: AiCostSummary
  /** null until a plan is chosen. Drives whether the OS upsell banner shows. */
  plan: string | null
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
    websitesRes,
    recentLeadsRes,
    subscriptionRes,
    budgetRes,
  ] = (await Promise.all([
    db.from("automations").select("*").eq("org_id", org.org_id)
      .order("created_at", { ascending: false }),

    db.from("workflow_executions")
      .select("id, automation_id, status, started_at, duration_ms, error")
      .eq("org_id", org.org_id)
      .order("started_at", { ascending: false })
      .limit(200),

    db.from("ai_requests")
      .select("id, function_name, status, model, cost_usd, input_tokens, output_tokens, created_at")
      .eq("org_id", org.org_id)
      .gte("created_at", sinceIso),

    db.from("leads").select("id, status, created_at").eq("org_id", org.org_id)
      .gte("created_at", sinceIso),

    db.from("invoices")
      .select("id, amount_cents, currency, status, created_at")
      .eq("org_id", org.org_id)
      .eq("status", "paid")
      .gte("created_at", sinceIso),

    db.from("websites").select("id, status").eq("org_id", org.org_id),

    // Latest leads for display, independent of the metrics window above —
    // a client on a 7-day view should still see their last 5 leads even if
    // all of them arrived 8 days ago.
    db.from("leads")
      .select("id, name, company, score, tier, status, source, created_at")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: false })
      .limit(5),

    db.from("subscriptions").select("plan, status").eq("org_id", org.org_id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),

    db.from("ai_usage_budgets")
      .select("monthly_limit_usd, current_spend_usd, alert_at_percent")
      .eq("org_id", org.org_id).maybeSingle(),
  ])) as [
    { data: Automation[] | null },
    { data: Array<{ id: string; automation_id: string; status: WorkflowExecutionStatus; started_at: string; duration_ms: number | null; error: string | null }> | null },
    { data: Array<{ id: string; function_name: string; status: string; model: string; cost_usd: number; input_tokens: number | null; output_tokens: number | null; created_at: string }> | null },
    { data: Array<{ id: string; status: string; created_at: string }> | null },
    { data: Array<{ id: string; amount_cents: number; currency: string; status: string; created_at: string }> | null },
    { data: Array<{ id: string; status: string }> | null },
    {
      data: Array<{
        id: string
        name: string | null
        company: string | null
        score: number
        tier: string | null
        status: string
        source: string | null
        created_at: string
      }> | null
    },
    { data: { plan: string; status: string } | null },
    { data: { monthly_limit_usd: number; current_spend_usd: number; alert_at_percent: number } | null },
  ]

  const automations = automationsRes.data ?? []
  const executions = executionsRes.data ?? []
  const aiRequests = aiRequestsRes.data ?? []
  const leads = leadsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const websites = websitesRes.data ?? []

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

  // ── Service overview ──────────────────────────────────────────────────────
  const services: ServiceOverview = {
    sites: {
      total: websites.length,
      live: websites.filter((w) => w.status === "live").length,
    },
    flow: {
      total: automations.length,
      active: automations.filter((a) => a.status === "active").length,
      successRate,
    },
    growth: { leads: leads.length },
    leadIntelligence: { total: leads.length },
    aiAgents: {
      total: agents.length,
      activeTasks: agents.reduce((sum, a) => sum + a.tasks, 0),
    },
    os: { active: isOsPlan(subscriptionRes.data?.plan) },
  }

  // ── Recent leads ───────────────────────────────────────────────────────────
  const recentLeads: RecentLead[] = (recentLeadsRes.data ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    score: l.score,
    tier: l.tier,
    status: l.status,
    source: l.source,
    createdAt: l.created_at,
  }))

  // ── AI cost ────────────────────────────────────────────────────────────────
  const currentPeriodRequests = aiRequests.filter((r) => {
    const t = new Date(r.created_at).getTime()
    return t >= periodStart && t < now
  })
  const costByModel = new Map<string, number>()
  for (const r of currentPeriodRequests) {
    costByModel.set(r.model, (costByModel.get(r.model) ?? 0) + (r.cost_usd ?? 0))
  }
  const aiCost: AiCostSummary = {
    byModel: [...costByModel.entries()]
      .map(([model, costUsd]) => ({ model, costUsd }))
      .sort((a, b) => b.costUsd - a.costUsd),
    totalCostUsd: currentPeriodRequests.reduce((sum, r) => sum + (r.cost_usd ?? 0), 0),
    budget: budgetRes.data
      ? {
          limitUsd: budgetRes.data.monthly_limit_usd,
          spentUsd: budgetRes.data.current_spend_usd,
          alertAtPercent: budgetRes.data.alert_at_percent,
        }
      : null,
  }

  return {
    orgId: org.org_id,
    period,
    metrics,
    series,
    activity,
    agents,
    automations,
    services,
    recentLeads,
    aiCost,
    plan: subscriptionRes.data?.plan ?? null,
    hasAnyData:
      automations.length > 0 ||
      executions.length > 0 ||
      leads.length > 0 ||
      aiRequests.length > 0,
  }
}
