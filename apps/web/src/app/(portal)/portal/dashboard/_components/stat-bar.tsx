"use client"

import { AreaChart, Area, ResponsiveContainer, Tooltip } from "recharts"

interface SparkPoint { v: number }

function toPoints(raw: number[]): SparkPoint[] {
  return raw.map((v) => ({ v }))
}

function Spark({
  data,
  color = "#00E5FF",
  gradientId,
}: {
  data: SparkPoint[]
  color?: string
  gradientId: string
}) {
  return (
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={color} stopOpacity={0.3} />
            <stop offset="95%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#${gradientId})`}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={() => null}
          cursor={{ stroke: color, strokeWidth: 1, strokeDasharray: "3 3" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

const STATS = [
  {
    key: "automations",
    label: "Active Automations",
    value: "2,841",
    accent: true,
    footer: (
      <span className="flex items-center gap-1.5 text-[11px] font-medium text-cyan-400">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
        Running
      </span>
    ),
    chart: null,
  },
  {
    key: "uptime",
    label: "System Uptime",
    value: "99.98%",
    accent: false,
    footer: (
      <span className="flex items-center gap-1.5 text-[11px] text-success-400">
        <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
        Operational
      </span>
    ),
    chart: null,
  },
  {
    key: "ai-tasks",
    label: "AI Tasks (Today)",
    value: "14.5k",
    accent: false,
    footer: null,
    chart: { data: toPoints([3, 6, 4, 8, 5, 9, 7, 11, 8, 13]), color: "#00E5FF", id: "spark-ai" },
  },
  {
    key: "leads",
    label: "Leads Generated",
    value: "312",
    accent: false,
    footer: null,
    chart: { data: toPoints([5, 7, 6, 9, 8, 7, 10, 12, 9, 14]), color: "#00E5FF", id: "spark-leads" },
  },
  {
    key: "revenue",
    label: "Revenue",
    value: "$4,200",
    accent: false,
    footer: null,
    chart: { data: toPoints([4, 5, 7, 6, 9, 8, 10, 11, 13, 15]), color: "#00E5FF", id: "spark-rev" },
  },
  {
    key: "success",
    label: "Automation Success Rate",
    value: "99.7%",
    accent: false,
    footer: (
      <span className="flex items-center gap-1 text-[11px] font-medium text-success-400">
        <span className="text-xs">✓</span>
        <span>Status</span>
      </span>
    ),
    chart: null,
  },
]

export function StatBar() {
  return (
    <div className="flex flex-1 gap-3 overflow-x-auto pb-0.5">
      {STATS.map((s) => (
        <div
          key={s.key}
          className={[
            "flex min-w-[112px] flex-1 flex-col rounded-lg border px-3 py-3",
            s.accent
              ? "border-cyan-500/40 bg-cyan-500/[0.07]"
              : "border-border-subtle bg-bg-elevated",
          ].join(" ")}
        >
          <p
            className="truncate text-[10px] font-medium leading-tight text-text-muted"
            title={s.label}
          >
            {s.label}
          </p>
          <p
            className={[
              "mt-1.5 truncate text-2xl font-bold tabular-nums leading-none",
              s.accent ? "text-cyan-400" : "text-text-primary",
            ].join(" ")}
          >
            {s.value}
          </p>
          <div className="mt-2 min-h-[32px]">
            {s.chart ? (
              <Spark
                data={s.chart.data}
                color={s.chart.color}
                gradientId={s.chart.id}
              />
            ) : (
              s.footer
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
