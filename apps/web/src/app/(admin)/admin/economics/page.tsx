import type { Metadata } from "next"
import { getEconomics } from "@/lib/economics"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "Economics | Admin" }

function usd(n: number): string {
  return `$${n.toFixed(2)}`
}

export default async function AdminEconomicsPage() {
  await requirePlatformAdmin()

  const { orgs, totals, period } = await getEconomics()
  const billing = orgs.filter((o) => o.revenueUsd > 0)
  const unprofitable = billing.filter((o) => o.grossContributionUsd <= 0)

  return (
    <div className="animate-fade-in px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Economics</h1>
        <p className="mt-1 text-sm text-text-muted">
          Cost per customer for {period}. AI spend is live; other categories come from the cost ledger.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="MRR" value={usd(totals.revenueUsd)} hint={`${billing.length} paying`} />
        <Card label="Cost to serve" value={usd(totals.costUsd)} hint="All categories" />
        <Card
          label="Gross contribution"
          value={usd(totals.grossContributionUsd)}
          hint={totals.marginPct === null ? "No revenue yet" : `${totals.marginPct}% margin`}
          tone={totals.grossContributionUsd >= 0 ? "good" : "bad"}
        />
        <Card
          label="Unprofitable accounts"
          value={String(unprofitable.length)}
          hint={unprofitable.length === 0 ? "All accounts positive" : "Costing more than they pay"}
          tone={unprofitable.length === 0 ? "good" : "bad"}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                {["Organisation", "Plan", "Revenue", "AI", "Email", "Other", "Total cost", "Contribution", "Margin"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {orgs.map((o) => {
                const other = o.costs.infra + o.costs.payments + o.costs.sms
                return (
                  <tr key={o.orgId} className="hover:bg-bg-surface/50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-text-primary">{o.orgName}</p>
                      {o.status && <p className="text-[11px] text-text-disabled">{o.status}</p>}
                    </td>
                    <td className="px-4 py-3 text-text-muted">{o.plan ?? "—"}</td>
                    <td className="px-4 py-3 tabular-nums text-text-primary">{usd(o.revenueUsd)}</td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">{usd(o.costs.ai)}</td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">{usd(o.costs.email)}</td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">{usd(other)}</td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">{usd(o.totalCostUsd)}</td>
                    <td
                      className={`px-4 py-3 font-semibold tabular-nums ${
                        o.grossContributionUsd >= 0 ? "text-success-400" : "text-error-400"
                      }`}
                    >
                      {usd(o.grossContributionUsd)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-text-muted">
                      {o.marginPct === null ? "—" : `${o.marginPct}%`}
                    </td>
                  </tr>
                )
              })}
              {orgs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-text-disabled">
                    No organisations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs text-text-disabled">
        Infra, payment-processing and SMS costs are read from `org_cost_ledger`, which is populated
        by the nightly cost job. Until that runs they show as $0.00 — they are not yet measured, not
        confirmed to be zero.
      </p>
    </div>
  )
}

function Card({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint: string
  tone?: "default" | "good" | "bad"
}) {
  const toneClass =
    tone === "good" ? "text-success-400" : tone === "bad" ? "text-error-400" : "text-text-primary"
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  )
}
