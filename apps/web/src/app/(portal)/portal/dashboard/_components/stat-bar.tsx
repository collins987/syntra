"use client"

import {
  AreaChart, Area,
  LineChart, Line,
  BarChart, Bar, Cell,
  ResponsiveContainer,
} from "recharts"

interface Pt { v: number }
const pts = (raw: number[]): Pt[] => raw.map((v) => ({ v }))

const LEADS_DATA = pts([2, 5, 3, 7, 4, 8, 6, 10, 7, 12])
const REVENUE_DATA = pts([3, 5, 4, 7, 5, 9, 6, 8, 10, 12])
const AI_DATA = pts([3, 6, 4, 8, 5, 9, 7, 11, 8, 13])

function AreaSpark({ data, id }: { data: Pt[]; id: string }) {
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

function LineSpark({ data }: { data: Pt[] }) {
  return (
    /* drop-shadow gives the "glowing cyan line" described in the spec */
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

function BarSpark({ data }: { data: Pt[] }) {
  const maxV = Math.max(...data.map((d) => d.v))
  return (
    /* drop-shadow gives the "glowing cyan bar chart" described in the spec */
    <div style={{ filter: "drop-shadow(0 0 3px rgba(0,229,255,0.45))" }}>
      <ResponsiveContainer width="100%" height={36}>
        <BarChart data={data} barSize={5} barGap={2}
          margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="v" radius={[2, 2, 0, 0]} isAnimationActive={false}>
            {data.map((d, i) => (
              <Cell
                key={i}
                fill={d.v === maxV ? "#00E5FF" : "rgba(0,229,255,0.35)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Card definitions ──────────────────────────────────────────────────────────

const CARDS = [
  {
    key: "automations",
    label: "Active Automations",
    value: "2,841",
    accent: true,
    footer: (
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-cyan-400">
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
      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-success-400">
        <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
        Operational
      </span>
    ),
    chart: null,
  },
  {
    key: "ai",
    label: "AI Tasks (Today)",
    value: "14.5k",
    accent: false,
    footer: null,
    chart: <AreaSpark data={AI_DATA} id="sp-ai" />,
  },
  {
    key: "leads",
    label: "Leads Generated",
    value: "312",
    accent: false,
    footer: null,
    // Spec: "glowing cyan line graph"
    chart: <LineSpark data={LEADS_DATA} />,
  },
  {
    key: "revenue",
    label: "Revenue",
    value: "$4,200",
    accent: false,
    footer: null,
    // Spec: "glowing cyan bar chart"
    chart: <BarSpark data={REVENUE_DATA} />,
  },
  {
    key: "success",
    label: "Automation Success Rate",
    value: "99.7%",
    accent: false,
    footer: (
      <span className="flex items-center gap-1 text-[11px] font-semibold text-success-400">
        <span className="text-[10px]">✓</span> Status
      </span>
    ),
    chart: null,
  },
]

export function StatBar() {
  return (
    <div className="flex gap-3">
      {CARDS.map((c) => (
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
