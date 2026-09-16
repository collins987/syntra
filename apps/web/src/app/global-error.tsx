"use client"

import * as Sentry from "@sentry/nextjs"
import Link from "next/link"
import { useEffect } from "react"

export default function GlobalError({
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
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-[#0a0a0f] p-6 font-sans text-white antialiased">
        <div className="max-w-md text-center">
          <p className="mb-2 font-mono text-xs uppercase tracking-widest text-cyan-500">
            Critical Error
          </p>
          <h1 className="mb-3 text-2xl font-semibold text-white">
            Something went wrong
          </h1>
          <p className="mb-8 text-sm leading-relaxed text-white/50">
            An unexpected error occurred. Our team has been notified automatically.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={reset}
              className="rounded-xl bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-cyan-400"
            >
              Try again
            </button>
            <Link
              href="/"
              className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-white/70 transition hover:border-white/20 hover:text-white"
            >
              Go home
            </Link>
          </div>
          {error.digest && (
            <p className="mt-6 font-mono text-[11px] text-white/20">
              ref: {error.digest}
            </p>
          )}
        </div>
      </body>
    </html>
  )
}
