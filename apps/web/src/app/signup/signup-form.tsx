"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { safeRedirect } from "@/lib/safe-redirect"

export function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }

    setLoading(true)
    const supabase = createClient()
    // Carries an invite link through email confirmation — without this, an
    // invited user who doesn't have an account yet loses the invite the
    // moment they have to confirm their email, and lands in fresh onboarding
    // instead of the org they were invited to.
    const target = new URLSearchParams(window.location.search).get("redirectTo")
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}${safeRedirect(target)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="space-y-3 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success-500/10 border border-success-500/20 mx-auto">
          <span className="text-success-400 text-lg">✓</span>
        </div>
        <p className="text-sm font-medium text-text-primary">Check your email</p>
        <p className="text-sm text-text-muted">
          We sent a confirmation link to <span className="text-text-secondary">{email}</span>.
          Click it to activate your account.
        </p>
        <a
          href="/login"
          className="mt-2 inline-flex h-9 w-full items-center justify-center rounded-md border border-border bg-transparent text-sm text-text-secondary hover:bg-bg-overlay transition-colors"
        >
          Back to sign in
        </a>
      </div>
    )
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
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
          required
          className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm" className="block text-sm font-medium text-text-secondary">
          Confirm password
        </label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
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
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-xs text-text-disabled">
        By signing up you agree to our{" "}
        <a href="/legal/terms" className="text-text-muted hover:text-cyan-400 transition-colors">Terms</a>
        {" "}and{" "}
        <a href="/legal/privacy" className="text-text-muted hover:text-cyan-400 transition-colors">Privacy Policy</a>.
      </p>
    </form>
  )
}
