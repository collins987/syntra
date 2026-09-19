"use client"

import * as React from "react"
import type { DashboardSeries, SeriesPoint } from "@/lib/dashboard"

type TabKey = "leads" | "revenue" | "aiTokens"

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "leads", label: "Leads" },
  { key: "revenue", label: "Revenue" },
  { key: "aiTokens", label: "AI Usage" },
]

const VIEW_W = 720
const VIEW_H = 200
const PAD_TOP = 12
const PAD_BOTTOM = 22

function formatDay(iso: string): string {
  const d = new Date(`${iso}T00:00:00`)
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function buildPath(points: SeriesPoint[], max: number): { line: string; area: string } {
  if (points.length === 0) return { line: "", area: "" }

  const usableH = VIEW_H - PAD_TOP - PAD_BOTTOM
  const stepX = points.length > 1 ? VIEW_W / (points.length - 1) : 0

  const coords = points.map((p, i) => {
    const x = points.length > 1 ? i * stepX : VIEW_W / 2
    const y = PAD_TOP + usableH - (max > 0 ? (p.v / max) * usableH : 0)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const line = `M${coords.join(" L")}`
  const area = `${line} L${VIEW_W},${PAD_TOP + usableH} L0,${PAD_TOP + usableH} Z`
  return { line, area }
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

  const max = Math.max(...points.map((p) => p.v), 0)
  const total = points.reduce((sum, p) => sum + p.v, 0)
  const { line, area } = buildPath(points, max)

  const first = points[0]
  const last = points[points.length - 1]
  const lastX = points.length > 1 ? VIEW_W : VIEW_W / 2
  const lastY = last ? PAD_TOP + (VIEW_H - PAD_TOP - PAD_BOTTOM) * (1 - (max > 0 ? last.v / max : 0)) : 0

  // The line draws itself in on load, matching the hero section's chart. That
  // one uses a fixed-length CSS keyframe (its illustration never changes
  // shape), but this path's length varies with the selected period — 7 vs 90
  // points on the same 720-wide viewBox produces very different path
  // lengths. A shared fixed-offset keyframe would either finish early or cut
  // the line off, so the length is measured at runtime and the reveal is
  // driven by a transition instead.
  const pathRef = React.useRef<SVGPathElement>(null)
  const [pathLength, setPathLength] = React.useState<number | null>(null)
  const [revealed, setRevealed] = React.useState(false)

  React.useEffect(() => {
    const length = pathRef.current?.getTotalLength() ?? null
    setPathLength(length)
    if (length === null) return

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true)
      return
    }

    setRevealed(false)
    // Two frames: the first paints the fully-hidden state, the second
    // starts the transition — combining them in one frame means the browser
    // never actually paints "hidden" and there's nothing to visibly draw.
    let raf2 = 0
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setRevealed(true))
    })
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
    }
  }, [line])

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
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="mt-5 h-[200px] w-full"
            preserveAspectRatio="none"
            role="img"
            aria-label={`${TABS.find((t) => t.key === tab)?.label} over the last ${periodDays} days`}
          >
            <defs>
              <linearGradient id="perf-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* No gridlines — the hero section's chart doesn't have them
                either, and they add visual noise a single-series line
                doesn't need. */}
            <path d={area} fill="url(#perf-fill)" className="animate-fade-in" />
            <path
              ref={pathRef}
              d={line}
              fill="none"
              stroke="#00E5FF"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              style={
                pathLength
                  ? {
                      strokeDasharray: pathLength,
                      strokeDashoffset: revealed ? 0 : pathLength,
                      transition: "stroke-dashoffset 1.4s cubic-bezier(0.65,0,0.35,1)",
                    }
                  : undefined
              }
            />
            {/* Live end-point — the number is still moving, same as the hero. */}
            {last && (
              <circle
                cx={lastX}
                cy={lastY}
                r="3"
                fill="#00E5FF"
                className="animate-pulse-slow motion-reduce:animate-none"
              />
            )}
          </svg>

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
