import type { DayBucket } from "@/lib/insights"

// Server-rendered bar chart. No chart library and no client JS — the values are
// static once the page renders.

export function BarChart({
  data,
  caption,
  tone = "cyan",
}: {
  data: DayBucket[]
  caption: string
  tone?: "cyan" | "error"
}) {
  const max = Math.max(...data.map((d) => d.value), 1)
  const total = data.reduce((n, d) => n + d.value, 0)
  const barColor = tone === "error" ? "bg-error-400/70" : "bg-cyan-500/70"

  const first = data[0]
  const last = data[data.length - 1]

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-xs text-text-muted">{caption}</span>
        <span className="tabular-nums text-xs text-text-disabled">
          peak {max} · total {total}
        </span>
      </div>

      <div className="flex h-28 items-end gap-[2px]" role="img" aria-label={`${caption}: ${total} total, peak ${max}`}>
        {data.map((d) => (
          <div
            key={d.date}
            title={`${d.label}: ${d.value}`}
            className="group relative flex-1 rounded-sm bg-bg-surface"
            style={{ height: "100%" }}
          >
            <div
              className={`absolute bottom-0 w-full rounded-sm ${barColor} transition-colors group-hover:bg-cyan-400`}
              style={{ height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[10px] text-text-disabled">
        <span>{first?.label}</span>
        <span>{last?.label}</span>
      </div>
    </div>
  )
}

export function DistributionBars({
  data,
  emptyLabel = "No data yet",
}: {
  data: Record<string, number>
  emptyLabel?: string
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
  if (entries.length === 0) {
    return <p className="text-sm text-text-disabled">{emptyLabel}</p>
  }
  const total = entries.reduce((n, [, v]) => n + v, 0)

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => {
        const pct = total > 0 ? Math.round((value / total) * 100) : 0
        return (
          <div key={key}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <span className="truncate text-sm text-text-primary">{key}</span>
              <span className="shrink-0 tabular-nums text-xs text-text-muted">
                {value} · {pct}%
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-surface">
              <div className="h-full rounded-full bg-cyan-500/70" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
