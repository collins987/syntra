"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

/**
 * Only same-origin relative paths. A bare "/" prefix is not enough: "//evil.com"
 * and "/\evil.com" are both read as protocol-relative URLs by browsers, which
 * would turn the post-login redirect into an open redirect.
 */
function safeRedirect(target: string | null): string {
  if (!target) return "/portal/dashboard"
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return "/portal/dashboard"
  }
  return target
}

export function LoginForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Read at submit time rather than via useSearchParams: this page renders
    // statically, and the hook would force a Suspense boundary around the form.
    const target = new URLSearchParams(window.location.search).get("redirectTo")
    router.push(safeRedirect(target))
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          required
          className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
            Password
          </label>
          <a href="/reset-password" className="text-xs text-text-muted hover:text-cyan-400 transition-colors">
            Forgot password?
          </a>
        </div>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      {error && (
        <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex h-9 w-full items-center justify-center rounded-md bg-cyan-500 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  )
}
