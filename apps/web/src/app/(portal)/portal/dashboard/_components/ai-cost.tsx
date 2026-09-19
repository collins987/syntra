import Link from "next/link"
import type { AiCostSummary } from "@/lib/dashboard"

// Cyan first (the model actually in use), then a fixed rotation for whatever
// else shows up — this only needs to be visually distinct per slice, not
// meaningful by colour the way status colours are elsewhere.
const SLICE_COLORS = ["#00E5FF", "#A78BFA", "#34D399", "#FBBF24", "#F87171"]

const R = 15.9155 // radius for a 100-unit circumference in a 32x32 viewBox

function money(n: number): string {
  return `$${n.toFixed(2)}`
}

export function AiCost({ cost }: { cost: AiCostSummary }) {
  const hasSpend = cost.totalCostUsd > 0
  let offset = 0

  const budgetPct = cost.budget && cost.budget.limitUsd > 0
    ? Math.min((cost.budget.spentUsd / cost.budget.limitUsd) * 100, 100)
    : null
  const overAlert =
    cost.budget !== null && budgetPct !== null && budgetPct >= cost.budget.alertAtPercent

  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          AI Usage &amp; Cost
        </span>
        <Link
          href="/portal/ai-usage"
          className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted"
        >
          View details
        </Link>
      </div>

      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
        {/* Donut */}
        <div className="relative mx-auto h-28 w-28 shrink-0 sm:mx-0">
          <svg viewBox="0 0 32 32" className="h-full w-full -rotate-90">
            <circle cx="16" cy="16" r={R} fill="none" stroke="#1E2935" strokeWidth="4" />
            {hasSpend &&
              cost.byModel.map((m, i) => {
                const pct = (m.costUsd / cost.totalCostUsd) * 100
                const dash = `${pct} ${100 - pct}`
                const dashoffset = -offset
                offset += pct
                return (
                  <circle
                    key={m.model}
                    cx="16"
                    cy="16"
                    r={R}
                    fill="none"
                    stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                    strokeWidth="4"
                    strokeDasharray={dash}
                    strokeDashoffset={dashoffset}
                    pathLength={100}
                    strokeLinecap={cost.byModel.length === 1 ? "butt" : "round"}
                  />
                )
              })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-lg font-semibold tabular-nums text-text-primary">
              {money(cost.totalCostUsd)}
            </span>
            <span className="text-[9px] text-text-disabled">Total cost</span>
          </div>
        </div>

        {/* Legend + budget */}
        <div className="min-w-0 flex-1">
          {hasSpend ? (
            <ul className="space-y-1.5">
              {cost.byModel.map((m, i) => (
                <li key={m.model} className="flex items-center gap-2 text-[11.5px]">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate text-text-secondary" title={m.model}>
                    {m.model}
                  </span>
                  <span className="shrink-0 font-mono tabular-nums text-text-primary">
                    {money(m.costUsd)}
                  </span>
                  <span className="w-9 shrink-0 text-right text-[10px] text-text-disabled">
                    {((m.costUsd / cost.totalCostUsd) * 100).toFixed(0)}%
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[11.5px] text-text-muted">
              No AI usage in this period yet. Cost appears here as your agents work.
            </p>
          )}

          {cost.budget ? (
            <div className="mt-4 border-t border-border-subtle/60 pt-3">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="text-text-muted">Monthly budget</span>
                <span className={overAlert ? "font-medium text-warning-400" : "text-text-disabled"}>
                  {money(cost.budget.spentUsd)} / {money(cost.budget.limitUsd)}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
                <div
                  className={`h-full rounded-full transition-all ${
                    overAlert ? "bg-warning-400" : "bg-cyan-500"
                  }`}
                  style={{ width: `${budgetPct ?? 0}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 border-t border-border-subtle/60 pt-3 text-[10.5px] text-text-disabled">
              No budget set — usage is unmetered.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
