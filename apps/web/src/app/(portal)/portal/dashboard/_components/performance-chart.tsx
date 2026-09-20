"use client"

import * as React from "react"
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, type DotItemDotProps } from "recharts"
import type { DashboardSeries, SeriesPoint } from "@/lib/dashboard"

type TabKey = "leads" | "revenue" | "aiTokens"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "leads", label: "Leads" },
  { key: "revenue", label: "Revenue" },
  { key: "aiTokens", label: "AI Usage" },
]

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function CustomTooltip({
  active,
  payload,
  isCurrency,
}: {
  active?: boolean
  payload?: Array<{ payload: SeriesPoint }>
  isCurrency: boolean
}) {
  if (!active || !payload?.[0]) return null
  const point = payload[0].payload
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-elevated px-3 py-2 shadow-modal">
      <p className="text-[10px] text-text-disabled">{formatDay(point.date)}</p>
      <p className="font-mono text-xs font-semibold tabular-nums text-text-primary">
        {isCurrency ? `$${point.v.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : point.v.toLocaleString()}
      </p>
    </div>
  )
}

/** A static marker on the latest point only — Recharts' `dot` render prop
 *  fires once per point, so every point but the last renders invisibly. */
function EndpointDot({ cx, cy, index, points }: DotItemDotProps) {
  const isLast = index === points.length - 1
  if (!isLast || cx === undefined || cy === undefined) return <circle cx={cx} cy={cy} r={0} fill="none" />
  return <circle cx={cx} cy={cy} r={3} fill="#00E5FF" stroke="none" />
}

export function PerformanceChart({
  series,
  periodDays,
}: {
  series: DashboardSeries
  periodDays: number
}) {
  const [tab, setTab] = React.useState<TabKey>("leads")
  const points = series[tab]
  const total = points.reduce((sum, p) => sum + p.v, 0)
  const first = points[0]
  const last = points[points.length - 1]

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">Business Performance</h2>
          <p className="mt-0.5 text-[11px] text-text-muted">Last {periodDays} days</p>
        </div>

        <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-base p-0.5">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              aria-pressed={tab === t.key}
              className={`rounded-md px-3 py-1 text-[11px] font-medium transition-colors ${
                tab === t.key
                  ? "bg-cyan-500/15 text-cyan-400"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {total === 0 ? (
        // The zero state is not an edge case here — it is what every client
        // sees on day one, so it says what will fill the chart rather than
        // drawing an empty axis and looking broken.
        <div className="mt-6 flex h-[200px] flex-col items-center justify-center rounded-lg border border-dashed border-border-subtle text-center">
          <p className="text-sm text-text-secondary">Nothing to chart yet</p>
          <p className="mt-1 max-w-xs text-[11px] leading-relaxed text-text-muted">
            {tab === "leads" && "Leads captured by your site will appear here as they arrive."}
            {tab === "revenue" && "Paid invoices will appear here once billing is active."}
            {tab === "aiTokens" && "Your agents' usage will appear here once they start working."}
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 h-[200px] w-full" aria-label={`${TABS.find((t) => t.key === tab)?.label} over the last ${periodDays} days`} role="img">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00E5FF" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#00E5FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                {/* Axes present but invisible: they establish the scale
                    Recharts needs without drawing gridlines or tick labels —
                    a single-series chart like this doesn't need them, and the
                    date range is already stated in the labels below. */}
                <XAxis dataKey="date" hide />
                <YAxis hide domain={[0, (max: number) => max * 1.1]} />
                <Tooltip
                  content={<CustomTooltip isCurrency={tab === "revenue"} />}
                  cursor={{ stroke: "#1E2935", strokeWidth: 1 }}
                />
                <Area
                  type="linear"
                  dataKey="v"
                  stroke="#00E5FF"
                  strokeWidth={1.5}
                  fill="url(#perf-fill)"
                  isAnimationActive={false}
                  activeDot={{ r: 4, fill: "#00E5FF", stroke: "none" }}
                  dot={EndpointDot}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center justify-between text-[10px] text-text-disabled">
            <span>{first ? formatDay(first.date) : ""}</span>
            <span className="font-mono tabular-nums text-text-muted">
              {tab === "revenue"
                ? `${total.toLocaleString(undefined, { maximumFractionDigits: 0 })} total`
                : `${total.toLocaleString()} total`}
            </span>
            <span>{last ? formatDay(last.date) : ""}</span>
          </div>
        </>
      )}
    </div>
  )
}
