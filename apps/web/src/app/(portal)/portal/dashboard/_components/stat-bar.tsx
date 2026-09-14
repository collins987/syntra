"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"

interface SparkPoint { v: number }
const toPoints = (raw: number[]): SparkPoint[] => raw.map((v) => ({ v }))

function Spark({ data, id }: { data: SparkPoint[]; id: string }) {
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#00E5FF" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0}    />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#00E5FF"
          strokeWidth={1.5}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface Stat {
  key: string
  label: string
  value: string
  accent?: boolean
  footer?: React.ReactNode
  spark?: { data: SparkPoint[]; id: string }
}

const STATS: Stat[] = [
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
  },
  {
    key: "uptime",
    label: "System Uptime",
    value: "99.98%",
    footer: (
      <span className="flex items-center gap-1.5 text-[11px] text-success-400">
        <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
        Operational
      </span>
    ),
  },
  {
    key: "ai",
    label: "AI Tasks (Today)",
    value: "14.5k",
    spark: { data: toPoints([3, 6, 4, 8, 5, 9, 7, 11, 8, 13]), id: "sp-ai" },
  },
  {
    key: "leads",
    label: "Leads Generated",
    value: "312",
    spark: { data: toPoints([5, 7, 6, 9, 8, 7, 10, 12, 9, 14]), id: "sp-leads" },
  },
  {
    key: "revenue",
    label: "Revenue",
    value: "$4,200",
    spark: { data: toPoints([4, 5, 7, 6, 9, 8, 10, 11, 13, 15]), id: "sp-rev" },
  },
  {
    key: "success",
    label: "Automation Success Rate",
    value: "99.7%",
    footer: (
      <span className="flex items-center gap-1 text-[11px] font-medium text-success-400">
        <span className="text-xs">✓</span> Status
      </span>
    ),
  },
]

export function StatBar() {
  return (
    <div className="flex gap-3">
      {STATS.map((s) => (
        <div
          key={s.key}
          className={[
            "flex min-w-0 flex-1 flex-col rounded-xl border px-4 py-4",
            s.accent
              ? "border-cyan-500/40 bg-cyan-500/[0.07]"
              : "border-border-subtle bg-bg-elevated",
          ].join(" ")}
        >
          <p className="truncate text-[10px] font-medium uppercase tracking-wide text-text-muted" title={s.label}>
            {s.label}
          </p>
          <p className={["mt-2 text-[28px] font-bold leading-none tabular-nums", s.accent ? "text-cyan-400" : "text-text-primary"].join(" ")}>
            {s.value}
          </p>
          <div className="mt-2 min-h-[36px] flex items-end">
            {s.spark ? (
              <div className="w-full">
                <Spark data={s.spark.data} id={s.spark.id} />
              </div>
            ) : (
              s.footer
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
