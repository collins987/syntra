"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"

export function BudgetForm({
  currentLimit,
  hardStop,
  isAdmin,
}: {
  currentLimit: number
  hardStop: boolean
  isAdmin: boolean
}) {
  const router = useRouter()
  const [limit, setLimit] = useState(String(currentLimit))
  const [stop, setStop] = useState(hardStop)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const res = await fetch("/api/ai/budget", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthlyLimitUsd: Number(limit), hardStop: stop }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not save the budget")
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-text-muted">
        Only an organisation admin can change the AI budget.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="ai-budget-limit" className="mb-1.5 block text-xs text-text-muted">
          Monthly limit (USD)
        </label>
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 transition-colors focus-within:border-cyan-500/40">
          <span className="text-sm text-text-disabled">$</span>
          <input
            id="ai-budget-limit"
            type="number"
            min={0}
            max={5000}
            step={5}
            value={limit}
            onChange={(e) => setLimit(e.target.value)}
            className="w-full bg-transparent text-sm tabular-nums text-text-primary outline-none"
          />
        </div>
      </div>

      <label
        htmlFor="ai-budget-hardstop"
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-border-subtle bg-bg-surface px-4 py-3"
      >
        <input
          id="ai-budget-hardstop"
          type="checkbox"
          checked={stop}
          onChange={(e) => setStop(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cyan-500"
        />
        <span>
          <span className="block text-sm text-text-primary">Stop at the limit</span>
          <span className="block text-xs text-text-muted">
            Refuse new AI requests once the budget is used up, rather than spending past it.
          </span>
        </span>
      </label>

      {error && (
        <p className="flex items-start gap-1.5 text-xs text-error-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="flex items-center gap-1.5 text-xs text-success-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Budget saved
        </p>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="flex h-10 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Save budget
      </button>
    </div>
  )
}
