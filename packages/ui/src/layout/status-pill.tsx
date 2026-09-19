"use client"

import * as React from "react"

// Mirrors the JSON shape /api/health returns (apps/web/src/lib/health.ts).
// Defined locally rather than imported: that route lives in a different
// workspace package with its own path aliases, and the shape is small and
// stable enough that duplicating it is cheaper than wiring a shared type.
export interface SystemHealth {
  ok: boolean
  checks: { db: boolean; n8n: boolean; ai: boolean }
  checkedAt: string
}

const POLL_MS = 60_000

const LABEL: Record<string, string> = {
  db: "Database",
  n8n: "Automations",
  ai: "AI agents",
}

function summarize(health: SystemHealth | null): { label: string; dot: string; text: string } {
  if (!health) {
    return { label: "Checking…", dot: "bg-text-disabled", text: "text-text-disabled" }
  }
  if (health.ok) {
    return { label: "System Online", dot: "bg-success-400 animate-pulse", text: "text-success-400" }
  }
  const downCount = Object.values(health.checks).filter((v) => !v).length
  const allDown = downCount === Object.keys(health.checks).length
  return allDown
    ? { label: "System Offline", dot: "bg-error-400", text: "text-error-400" }
    : { label: "Degraded", dot: "bg-warning-400", text: "text-warning-400" }
}

/**
 * "System Online" is a claim about real infrastructure, so it has to come
 * from a real check — see /api/health — never a hardcoded string. Renders
 * with the SSR'd initial value so there is no flash of "Checking…" on first
 * paint, then refreshes on its own so a mid-session outage is reflected
 * without the user having to navigate anywhere.
 */
export function StatusPill({ initial }: { initial: SystemHealth | null }) {
  const [health, setHealth] = React.useState<SystemHealth | null>(initial)

  React.useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch("/api/health", { cache: "no-store" })
        if (!res.ok) return
        const data = (await res.json()) as SystemHealth
        if (!cancelled) setHealth(data)
      } catch {
        // A failed fetch (offline, a blip) is not evidence the system is
        // down — keep showing the last known-good state rather than flip to
        // an alarming one on a network hiccup local to this browser tab.
      }
    }

    const id = window.setInterval(poll, POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const { label, dot, text } = summarize(health)
  const title = health
    ? Object.entries(health.checks)
        .map(([key, ok]) => `${LABEL[key] ?? key}: ${ok ? "ok" : "unreachable"}`)
        .join(" · ")
    : undefined

  return (
    <div
      title={title}
      className="hidden items-center gap-1.5 rounded-full border border-border-subtle bg-bg-base px-2.5 py-1 sm:flex"
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      <span className={`text-[11px] font-medium ${text}`}>{label}</span>
    </div>
  )
}
