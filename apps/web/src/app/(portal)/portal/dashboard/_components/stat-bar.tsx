"use client"

import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar, Cell,
  ResponsiveContainer,
} from "recharts"
import type { DashboardStats, DashboardSparklines, SparkPoint } from "@/lib/dashboard"

function hasSignal(data: SparkPoint[]) {
  return data.some((d) => d.v > 0)
}

function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return n.toLocaleString()
}

function money(cents: number, currency: string) {
  const amount = cents / 100
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: amount >= 1000 ? 0 : 2,
  }).format(amount)
  return formatted
}

function AreaSpark({ data, id }: { data: SparkPoint[]; id: string }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00E5FF" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}   />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v" stroke="#00E5FF" strokeWidth={1.5}
          fill={`url(#${id})`} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function LineSpark({ data }: { data: SparkPoint[] }) {
  return (
    <div style={{ filter: "drop-shadow(0 0 4px rgba(0,229,255,0.55))" }}>
      <ResponsiveContainer width="100%" height={36}>
        <LineChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Line type="monotone" dataKey="v" stroke="#00E5FF" strokeWidth={2}
            dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

function BarSpark({ data }: { data: SparkPoint[] }) {
  const maxV = Math.max(...data.map((d) => d.v))
  return (
    <div style={{ filter: "drop-shadow(0 0 3px rgba(0,229,255,0.45))" }}>
      <ResponsiveContainer width="100%" height={36}>
        <BarChart data={data} barSize={5} barGap={2}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.v === maxV && maxV > 0 ? "#00E5FF" : "rgba(0,229,255,0.35)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function NoSignal({ label }: { label: string }) {
  return <span className="text-[11px] text-text-disabled">{label}</span>
}

export function StatBar({
  stats,
  sparklines,
}: {
  stats: DashboardStats
  sparklines: DashboardSparklines
}) {
  const degraded = stats.totalAutomations > 0 && stats.activeAutomations === 0

  const cards = [
    {
      key: "automations",
      label: "Active Automations",
      value: stats.activeAutomations.toLocaleString(),
      accent: true,
      footer:
        stats.activeAutomations > 0 ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
            Running
          </span>
        ) : (
          <NoSignal label={stats.totalAutomations > 0 ? "All paused" : "None yet"} />
        ),
      chart: null,
    },
    {
      key: "status",
      label: "System Status",
      value: degraded ? "Paused" : "Online",
      accent: false,
      footer: (
        <span
          className={[
            "flex items-center gap-1.5 text-[11px] font-semibold",
            degraded ? "text-warning-400" : "text-success-400",
          ].join(" ")}
        >
          <span
            className={[
              "h-1.5 w-1.5 rounded-full",
              degraded ? "bg-warning-400" : "bg-success-400",
            ].join(" ")}
          />
          {degraded ? "Attention" : "Operational"}
        </span>
      ),
      chart: null,
    },
    {
      key: "ai",
      label: "AI Tasks (Today)",
      value: compact(stats.aiTasksToday),
      accent: false,
      footer: <NoSignal label="No AI activity yet" />,
      chart: hasSignal(sparklines.aiTasks) ? <AreaSpark data={sparklines.aiTasks} id="sp-ai" /> : null,
    },
    {
      key: "leads",
      label: "Leads Generated",
      value: compact(stats.totalLeads),
      accent: false,
      footer: <NoSignal label="No leads yet" />,
      chart: hasSignal(sparklines.leads) ? <LineSpark data={sparklines.leads} /> : null,
    },
    {
      key: "revenue",
      label: "Revenue",
      value: money(stats.revenueCents, stats.currency),
      accent: false,
      footer: <NoSignal label="No invoices yet" />,
      chart: hasSignal(sparklines.revenue) ? <BarSpark data={sparklines.revenue} /> : null,
    },
    {
      key: "success",
      label: "Automation Success Rate",
      value: stats.successRate === null ? "—" : `${stats.successRate.toFixed(1)}%`,
      accent: false,
      footer:
        stats.successRate === null ? (
          <NoSignal label="No runs yet" />
        ) : (
          <span
            className={[
              "flex items-center gap-1 text-[11px] font-semibold",
              stats.successRate >= 95 ? "text-success-400" : "text-warning-400",
            ].join(" ")}
          >
            <span className="text-[10px]">{stats.successRate >= 95 ? "✓" : "!"}</span> Status
          </span>
        ),
      chart: null,
    },
  ]

  return (
    <div className="flex gap-3">
      {cards.map((c) => (
        <div
          key={c.key}
          className={[
            "flex min-w-0 flex-1 flex-col rounded-xl border px-4 py-4",
            c.accent
              ? "border-cyan-500/40 bg-cyan-500/[0.07]"
              : "border-border-subtle bg-bg-elevated",
          ].join(" ")}
        >
          <p
            className="truncate text-[10px] font-medium uppercase tracking-wide text-text-muted"
            title={c.label}
          >
            {c.label}
          </p>
          <p
            className={[
              "mt-2 text-[28px] font-bold leading-none tabular-nums",
              c.accent ? "text-cyan-400" : "text-text-primary",
            ].join(" ")}
          >
            {c.value}
          </p>
          <div className="mt-2 flex min-h-[36px] items-end">
            {c.chart ?? c.footer}
          </div>
        </div>
      ))}
    </div>
  )
}
