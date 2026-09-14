"use client"

import { useState } from "react"

export function ManageSubscriptionButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleManage() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) throw new Error(data.error ?? "Portal unavailable")
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-error-400">{error}</p>}
      <button
        onClick={handleManage}
        disabled={loading}
        className="flex h-9 items-center rounded-xl border border-border-subtle bg-bg-surface px-5 text-sm text-text-muted transition-all hover:border-border hover:text-text-primary disabled:opacity-60"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Opening...
          </span>
        ) : (
          "Manage subscription →"
        )}
      </button>
    </div>
  )
}
