import { createServiceClient } from "@/lib/supabase/service"
import { getPlan } from "@/lib/pricing"

// Cost per customer, computed from what we actually spent rather than estimated.
// This is the number that says whether a plan is profitable.
// See SYNTRA_BUILD_PLAN.md Stage 3.

export interface OrgEconomics {
  orgId: string
  orgName: string
  plan: string | null
  status: string | null
  revenueUsd: number
  costs: { ai: number; email: number; infra: number; payments: number; sms: number }
  totalCostUsd: number
  grossContributionUsd: number
  marginPct: number | null
}

export interface EconomicsView {
  orgs: OrgEconomics[]
  totals: {
    revenueUsd: number
    costUsd: number
    grossContributionUsd: number
    marginPct: number | null
  }
  period: string
}

function monthStart(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

const EMPTY_COSTS = { ai: 0, email: 0, infra: 0, payments: 0, sms: 0 }

/**
 * Current-month economics for every organisation.
 *
 * AI cost is read live from ai_requests so it is accurate the moment it is spent.
 * Other categories come from org_cost_ledger, written by the nightly cost job.
 */
export async function getEconomics(): Promise<EconomicsView> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const periodStart = monthStart()
  const periodIso = periodStart.toISOString()

  const [orgsRes, subsRes, aiRes, ledgerRes] = await Promise.all([
    db.from("organizations").select("id, name, plan"),
    db.from("subscriptions").select("org_id, plan, status"),
    db.from("ai_requests").select("org_id, cost_usd").gte("created_at", periodIso),
    db
      .from("org_cost_ledger")
      .select("org_id, category, amount_usd")
      .gte("period", periodIso.slice(0, 10)),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgs: any[] = orgsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subs: any[] = subsRes.data ?? []
  const aiRows: Array<{ org_id: string; cost_usd: number }> = aiRes.data ?? []
  const ledger: Array<{ org_id: string; category: string; amount_usd: number }> =
    ledgerRes.data ?? []

  const subByOrg = new Map(subs.map((s) => [s.org_id, s]))

  const aiByOrg = new Map<string, number>()
  for (const r of aiRows) {
    aiByOrg.set(r.org_id, (aiByOrg.get(r.org_id) ?? 0) + Number(r.cost_usd ?? 0))
  }

  const ledgerByOrg = new Map<string, Record<string, number>>()
  for (const r of ledger) {
    const bucket = ledgerByOrg.get(r.org_id) ?? { ...EMPTY_COSTS }
    bucket[r.category] = (bucket[r.category] ?? 0) + Number(r.amount_usd ?? 0)
    ledgerByOrg.set(r.org_id, bucket)
  }

  const rows: OrgEconomics[] = orgs.map((org) => {
    const sub = subByOrg.get(org.id)
    const planId = sub?.plan ?? org.plan ?? null
    const isBilling = sub?.status === "active" || sub?.status === "trialing"
    const revenueUsd = isBilling && planId ? (getPlan(planId)?.priceUsd ?? 0) : 0

    const fromLedger = ledgerByOrg.get(org.id) ?? { ...EMPTY_COSTS }
    const costs = {
      ...EMPTY_COSTS,
      ...fromLedger,
      // Live AI spend supersedes any ledger entry for the current month.
      ai: Number((aiByOrg.get(org.id) ?? 0).toFixed(4)),
    }

    const totalCostUsd = Number(
      Object.values(costs).reduce((a, b) => a + b, 0).toFixed(4)
    )
    const grossContributionUsd = Number((revenueUsd - totalCostUsd).toFixed(2))

    return {
      orgId: org.id,
      orgName: org.name,
      plan: planId,
      status: sub?.status ?? null,
      revenueUsd,
      costs,
      totalCostUsd,
      grossContributionUsd,
      marginPct: revenueUsd > 0 ? Math.round((grossContributionUsd / revenueUsd) * 100) : null,
    }
  })

  rows.sort((a, b) => b.revenueUsd - a.revenueUsd || a.orgName.localeCompare(b.orgName))

  const revenueUsd = rows.reduce((n, r) => n + r.revenueUsd, 0)
  const costUsd = Number(rows.reduce((n, r) => n + r.totalCostUsd, 0).toFixed(4))
  const grossContributionUsd = Number((revenueUsd - costUsd).toFixed(2))

  return {
    orgs: rows,
    totals: {
      revenueUsd,
      costUsd,
      grossContributionUsd,
      marginPct: revenueUsd > 0 ? Math.round((grossContributionUsd / revenueUsd) * 100) : null,
    },
    period: periodStart.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
  }
}
