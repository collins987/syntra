"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import { createClient } from "@/lib/supabase/client"

interface Props {
  token: string
  email: string
}

/**
 * Client component. Collects a password + confirmation, exchanges the invite
 * token for a password via /api/auth/set-password, then signs the user in
 * directly from the browser so the Supabase session cookie is set in the
 * normal auth path. On success the user lands on the portal dashboard.
 */
export function ActivateForm({ token, email }: Props) {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match.")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        email?: string
        error?: string
      }

      if (!res.ok || !payload.ok) {
        setError(payload.error ?? "We couldn't activate your account. Try again.")
        setLoading(false)
        return
      }

      // Set-password succeeded; now establish the session the normal way.
      const supabase = createClient()
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: payload.email ?? email,
        password,
      })

      if (signInErr) {
        // The password is set but we couldn't sign them in from here. Send
        // them to the login page where they can finish — far from ideal but
        // never leaves them stuck.
        router.push("/login")
        return
      }

      router.push("/portal/dashboard")
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">
          Email
        </label>
        <input
          type="email"
          value={email}
          readOnly
          className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-muted"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-text-secondary">
          Set a password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="At least 8 characters"
          required
          minLength={8}
          autoComplete="new-password"
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
          placeholder="Repeat your password"
          required
          minLength={8}
          autoComplete="new-password"
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
        {loading ? "Activating..." : "Activate account"}
      </button>
    </form>
  )
}
