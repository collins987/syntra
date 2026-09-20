"use client"

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

// Catches an error thrown by any page under /portal. It cannot catch one
// thrown by (portal)/layout.tsx itself (the org/notifications/health
// queries) — Next.js bubbles that to the nearest ancestor boundary, which is
// global-error.tsx. This one only needs to handle a page failing after the
// shell has already rendered, so the sidebar and topbar stay mounted and
// the error appears where the page's content would have been.
export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex h-full items-center justify-center p-8">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-error-500/20 bg-error-500/5">
          <AlertTriangle className="h-5 w-5 text-error-400" />
        </div>
        <h1 className="text-base font-semibold text-text-primary">Something went wrong</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-muted">
          This page couldn&apos;t load. Our team has been notified — try again, or head back to
          your dashboard.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="flex h-9 items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400"
          >
            Try again
          </button>
          <Link
            href="/portal/dashboard"
            className="flex h-9 items-center rounded-xl border border-border-subtle px-5 text-sm text-text-muted transition-colors hover:border-border hover:text-text-primary"
          >
            Go to dashboard
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] text-text-disabled">ref: {error.digest}</p>
        )}
      </div>
    </div>
  )
}
