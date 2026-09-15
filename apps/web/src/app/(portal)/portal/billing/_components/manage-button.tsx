"use client"

import { useState } from "react"
import Link from "next/link"

export function ManageSubscriptionButton({
  paymentProvider = "stripe",
}: {
  paymentProvider?: "stripe" | "flutterwave"
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleManageStripe() {
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

  if (paymentProvider === "flutterwave") {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href="mailto:billing@syntra.io?subject=Manage%20M-Pesa%20Subscription"
          className="flex h-9 items-center rounded-xl border border-border-subtle bg-bg-surface px-5 text-sm text-text-muted transition-all hover:border-border hover:text-text-primary"
        >
          Contact billing →
        </Link>
        <p className="text-[11px] text-text-disabled">Paid via M-Pesa · Flutterwave</p>
      </div>
    )
  }

  return (
    <div>
      {error && <p className="mb-2 text-xs text-error-400">{error}</p>}
      <button
        onClick={handleManageStripe}
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
