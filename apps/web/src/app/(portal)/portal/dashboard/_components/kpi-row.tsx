import { ArrowDownRight, ArrowUpRight, Bot, Coins, Users, UserCheck, Zap } from "lucide-react"
import type { DashboardMetrics, DashboardPeriod, Metric } from "@/lib/dashboard"

// Five cards, not the six in the reference design: "Marketing Reach" has no
// data source anywhere in the schema, and this screen shows a client their own
// business. A number with nothing behind it does not belong here.

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function money(cents: number, currency: string): string {
  const amount = cents / 100
  const symbol = currency.toLowerCase() === "kes" ? "KES " : "$"
  return `${symbol}${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

/** Renders the delta chip, or nothing when there is no honest comparison. */
function Delta({ metric, period }: { metric: Metric; period: DashboardPeriod }) {
  if (metric.changePct === null) {
    return (
      <p className="mt-2 text-[11px] text-text-disabled">
        {metric.current > 0 ? "First activity in this period" : `No activity in ${period} days`}
      </p>
    )
  }

  const up = metric.changePct >= 0
  const Icon = up ? ArrowUpRight : ArrowDownRight

  return (
    <p className="mt-2 flex items-center gap-1.5 text-[11px] text-text-disabled">
      <span
        className={`inline-flex items-center gap-0.5 font-medium ${
          up ? "text-success-400" : "text-error-400"
        }`}
      >
        <Icon className="h-3 w-3" />
        {Math.abs(metric.changePct).toFixed(0)}%
      </span>
      vs. previous {period} days
    </p>
  )
}

function Card({
  icon: Icon,
  label,
  value,
  children,
}: {
  icon: React.ElementType
  label: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 transition-colors hover:border-cyan-500/30">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08]">
        <Icon className="h-4 w-4 text-cyan-400" />
      </span>
      <p className="mt-3 text-[12px] text-text-muted">{label}</p>
      <p className="mt-0.5 font-mono text-2xl font-semibold tabular-nums text-text-primary">
        {value}
      </p>
      {children}
    </div>
  )
}

export function KpiRow({
  metrics,
  period,
}: {
  metrics: DashboardMetrics
  period: DashboardPeriod
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      <Card icon={Users} label="Total Leads" value={compact(metrics.leads.current)}>
        <Delta metric={metrics.leads} period={period} />
      </Card>

      <Card
        icon={UserCheck}
        label="Qualified Leads"
        value={compact(metrics.qualifiedLeads.current)}
      >
        <Delta metric={metrics.qualifiedLeads} period={period} />
      </Card>

      {/* Automations are a current state, not a flow through the period, so a
          "vs. previous" figure would be meaningless. Shows the split instead. */}
      <Card icon={Zap} label="Automations" value={String(metrics.activeAutomations)}>
        <p className="mt-2 text-[11px] text-text-disabled">
          {metrics.totalAutomations === 0
            ? "None connected yet"
            : `of ${metrics.totalAutomations} · ${
                metrics.successRate === null
                  ? "no runs yet"
                  : `${metrics.successRate.toFixed(0)}% success`
              }`}
        </p>
      </Card>

      <Card icon={Bot} label="AI Usage" value={compact(metrics.aiTokens.current)}>
        <Delta metric={metrics.aiTokens} period={period} />
      </Card>

      <Card
        icon={Coins}
        label="Revenue"
        value={money(metrics.revenueCents.current, metrics.currency)}
      >
        <Delta metric={metrics.revenueCents} period={period} />
      </Card>
    </div>
  )
}
