import { createClient } from "@/lib/supabase/server"

// Shared aggregation for Analytics, Marketing and Reports so the three pages
// can never disagree about the same number.

export interface DayBucket {
  date: string
  label: string
  value: number
}

export interface PeriodInsights {
  periodDays: number
  leads: {
    total: number
    previousTotal: number
    changePct: number | null
    byTier: Record<string, number>
    bySource: Record<string, number>
    byStatus: Record<string, number>
    avgScore: number | null
    daily: DayBucket[]
  }
  executions: {
    total: number
    succeeded: number
    failed: number
    successRate: number | null
    avgDurationMs: number | null
    daily: DayBucket[]
  }
  ai: { requests: number; costUsd: number }
  revenue: { paidInvoices: number; totalUsd: number; currency: string }
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function buildDays(days: number): DayBucket[] {
  const out: DayBucket[] = []
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86_400_000)
    out.push({
      date: dayKey(d),
      label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
      value: 0,
    })
  }
  return out
}

function fill(buckets: DayBucket[], rows: Array<{ ts: string }>): DayBucket[] {
  const index = new Map(buckets.map((b, i) => [b.date, i]))
  for (const r of rows) {
    const i = index.get(r.ts.slice(0, 10))
    if (i !== undefined) buckets[i]!.value += 1
  }
  return buckets
}

function tally<T extends string>(
  rows: Array<Record<string, unknown>>,
  field: string,
  fallback: T
): Record<string, number> {
  const out: Record<string, number> = {}
  for (const r of rows) {
    const raw = r[field]
    const key = typeof raw === "string" && raw ? raw : fallback
    out[key] = (out[key] ?? 0) + 1
  }
  return out
}

export async function getInsights(orgId: string, periodDays = 30): Promise<PeriodInsights> {
  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const now = Date.now()
  const from = new Date(now - periodDays * 86_400_000).toISOString()
  const prevFrom = new Date(now - periodDays * 2 * 86_400_000).toISOString()

  const [leadsRes, prevLeadsRes, execRes, aiRes, invoiceRes] = await Promise.all([
    db
      .from("leads")
      .select("tier, source, status, score, created_at")
      .eq("org_id", orgId)
      .gte("created_at", from),
    db
      .from("leads")
      .select("id")
      .eq("org_id", orgId)
      .gte("created_at", prevFrom)
      .lt("created_at", from),
    db
      .from("workflow_executions")
      .select("status, duration_ms, started_at")
      .eq("org_id", orgId)
      .gte("started_at", from),
    db
      .from("ai_requests")
      .select("cost_usd, created_at")
      .eq("org_id", orgId)
      .gte("created_at", from),
    db
      .from("invoices")
      .select("amount_cents, currency, status, created_at")
      .eq("org_id", orgId)
      .eq("status", "paid")
      .gte("created_at", from),
  ])

  interface LeadRow {
    tier: string | null
    source: string | null
    status: string
    score: number | null
    created_at: string
  }
  interface ExecRow {
    status: string
    duration_ms: number | null
    started_at: string
  }

  const leads: LeadRow[] = leadsRes.data ?? []
  const previousTotal = (prevLeadsRes.data ?? []).length
  const executions: ExecRow[] = execRes.data ?? []
  const aiRows: Array<{ cost_usd: number }> = aiRes.data ?? []
  const invoices: Array<{ amount_cents: number; currency: string }> = invoiceRes.data ?? []

  const finished = executions.filter((e) => e.status === "completed" || e.status === "failed")
  const succeeded = executions.filter((e) => e.status === "completed").length
  const failed = executions.filter((e) => e.status === "failed").length
  const durations = executions.map((e) => e.duration_ms).filter((d): d is number => d != null)

  const scores = leads.map((l) => l.score ?? 0)

  return {
    periodDays,
    leads: {
      total: leads.length,
      previousTotal,
      changePct:
        previousTotal > 0
          ? Math.round(((leads.length - previousTotal) / previousTotal) * 100)
          : null,
      byTier: tally(leads as unknown as Array<Record<string, unknown>>, "tier", "unscored"),
      bySource: tally(leads as unknown as Array<Record<string, unknown>>, "source", "direct"),
      byStatus: tally(leads as unknown as Array<Record<string, unknown>>, "status", "new"),
      avgScore: scores.length
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null,
      daily: fill(buildDays(periodDays), leads.map((l) => ({ ts: l.created_at }))),
    },
    executions: {
      total: executions.length,
      succeeded,
      failed,
      successRate: finished.length ? Math.round((succeeded / finished.length) * 100) : null,
      avgDurationMs: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : null,
      daily: fill(buildDays(periodDays), executions.map((e) => ({ ts: e.started_at }))),
    },
    ai: {
      requests: aiRows.length,
      costUsd: Number(aiRows.reduce((n, r) => n + Number(r.cost_usd ?? 0), 0).toFixed(4)),
    },
    revenue: {
      paidInvoices: invoices.length,
      totalUsd: invoices.reduce((n, i) => n + (i.amount_cents ?? 0), 0) / 100,
      currency: invoices[0]?.currency ?? "usd",
    },
  }
}
