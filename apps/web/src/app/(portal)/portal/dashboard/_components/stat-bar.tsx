import * as React from "react"

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 64},${18 - ((v - min) / range) * 14}`)
    .join(" ")
  return (
    <svg width="64" height="20" viewBox="0 0 64 20">
      <polyline
        points={pts}
        fill="none"
        stroke="#00E5FF"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
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
    key: "ai-tasks",
    label: "AI Tasks (Today)",
    value: "14.5k",
    footer: <Sparkline data={[3, 6, 4, 8, 5, 9, 7, 11, 8, 13]} />,
  },
  {
    key: "leads",
    label: "Leads Generated",
    value: "312",
    footer: <Sparkline data={[5, 7, 6, 9, 8, 7, 10, 12, 9, 14]} />,
  },
  {
    key: "revenue",
    label: "Revenue",
    value: "$4,200",
    footer: <Sparkline data={[4, 5, 7, 6, 9, 8, 10, 11, 13, 15]} />,
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
    <div className="flex flex-1 gap-3 overflow-x-auto pb-0.5">
      {STATS.map((s) => (
        <div
          key={s.key}
          className={[
            "flex min-w-[110px] flex-1 flex-col rounded-lg border px-3 py-3",
            s.accent
              ? "border-cyan-500/40 bg-cyan-500/[0.06]"
              : "border-border-subtle bg-bg-elevated",
          ].join(" ")}
        >
          <p className="truncate text-[10px] font-medium text-text-muted">{s.label}</p>
          <p
            className={[
              "mt-1 text-2xl font-bold tabular-nums leading-none",
              s.accent ? "text-cyan-400" : "text-text-primary",
            ].join(" ")}
          >
            {s.value}
          </p>
          <div className="mt-2">{s.footer}</div>
        </div>
      ))}
    </div>
  )
}
