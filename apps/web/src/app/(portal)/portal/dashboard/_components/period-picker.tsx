"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/lib/dashboard-periods"

// The range is real: it goes into the URL, the server re-queries against it,
// and every figure on the page — including each "vs. previous" delta — is
// recomputed for the window chosen.
export function PeriodPicker({ value }: { value: DashboardPeriod }) {
  const router = useRouter()
  const params = useSearchParams()

  function select(days: DashboardPeriod) {
    const next = new URLSearchParams(params.toString())
    next.set("days", String(days))
    router.push(`/portal/dashboard?${next.toString()}`)
  }

  return (
    <div className="flex items-center gap-2">
      <CalendarDays className="h-3.5 w-3.5 shrink-0 text-text-disabled" />
      <div className="flex gap-1 rounded-lg border border-border-subtle bg-bg-base p-0.5">
        {DASHBOARD_PERIODS.map((days) => (
          <button
            key={days}
            onClick={() => select(days)}
            aria-pressed={value === days}
            className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors ${
              value === days
                ? "bg-cyan-500/15 text-cyan-400"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {days}d
          </button>
        ))}
      </div>
    </div>
  )
}
