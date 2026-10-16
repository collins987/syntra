"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FileText, Check } from "lucide-react"

interface Props {
  userId: string
}

/**
 * Per-client "Generate monthly report" action. Defaults to last month in UTC
 * on the server (the admin can override by editing the dates). Idempotent —
 * clicking twice for the same period overwrites rather than duplicates
 * (unique index on user_id + period_start + period_end).
 */
export function GenerateReport({ userId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [periodStart, setPeriodStart] = useState(defaultStart())
  const [periodEnd, setPeriodEnd] = useState(defaultEnd())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ id: string } | null>(null)

  async function generate() {
    setError(null)
    setSuccess(null)
    setLoading(true)
    const res = await fetch("/api/admin/reports/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        period_start: periodStart,
        period_end: periodEnd,
      }),
    })
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      report?: { id: string }
      error?: string
    }
    setLoading(false)
    if (!res.ok || !payload.ok || !payload.report) {
      setError(payload.error ?? "Failed to generate.")
      return
    }
    setSuccess({ id: payload.report.id })
    router.refresh()
  }

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Reports
        </h2>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <FileText className="h-3 w-3" />
          {open ? "Cancel" : "Generate report"}
        </button>
      </div>

      {!open ? (
        <p className="text-xs text-text-muted">
          Manually generate a monthly report. The scheduled cron runs on the 1st of each month for all active clients.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-text-secondary">
              Period start
              <input
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
              />
            </label>
            <label className="space-y-1 text-xs text-text-secondary">
              Period end
              <input
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="mt-1 h-8 w-full rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
              />
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-xs text-error-400">
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center justify-between rounded-md border border-success-500/20 bg-success-500/10 px-3 py-2 text-xs text-success-400">
              <span className="inline-flex items-center gap-1.5">
                <Check className="h-3 w-3" />
                Report generated.
              </span>
              <Link
                href={`/admin/clients/${userId}`}
                className="text-success-400 underline underline-offset-2"
              >
                Refresh
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={generate}
            disabled={loading || !periodStart || !periodEnd}
            className="inline-flex h-8 items-center rounded-md bg-cyan-500 px-4 text-xs font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {loading ? "Generating…" : "Generate"}
          </button>
        </div>
      )}
    </div>
  )
}

function defaultStart(): string {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
    .toISOString()
    .slice(0, 10)
}

function defaultEnd(): string {
  const now = new Date()
  const firstOfThis = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const lastOfLast = new Date(firstOfThis.getTime() - 86_400_000)
  return lastOfLast.toISOString().slice(0, 10)
}
