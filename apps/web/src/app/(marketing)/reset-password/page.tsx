"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { MarketingShell } from "@/components/marketing/shell"

type Mode = "request" | "sent" | "update" | "done"

export default function ResetPasswordPage() {
  return (
    <MarketingShell>
      <Suspense fallback={<div className="min-h-[60vh]" />}>
        <ResetPasswordContent />
      </Suspense>
    </MarketingShell>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // When Supabase emails the reset link, it appends ?code=... to this page's URL.
  // The middleware (updateSession) exchanges the code for a recovery session before
  // React renders, so by this point the session is already in cookies.
  const hasCode = !!searchParams.get("code")

  const [mode, setMode] = useState<Mode>(hasCode ? "update" : "request")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  async function requestReset(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMode("sent")
    }
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }
    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setMode("done")
      setTimeout(() => router.push("/portal/dashboard"), 2000)
    }
  }

  const iconMap: Record<Mode, React.ReactNode> = {
    request: <Lock className="h-5 w-5 text-text-muted" />,
    sent: <Mail className="h-5 w-5 text-cyan-400" />,
    update: <Lock className="h-5 w-5 text-cyan-400" />,
    done: <CheckCircle2 className="h-5 w-5 text-cyan-400" />,
  }

  const titleMap: Record<Mode, string> = {
    request: "Reset your password",
    sent: "Check your email",
    update: "Set new password",
    done: "Password updated",
  }

  const subtitleMap: Record<Mode, string> = {
    request: "Enter your email and we’ll send a reset link.",
    sent: `We sent a reset link to ${email}.`,
    update: "Choose a strong password for your account.",
    done: "Redirecting you to your dashboard…",
  }

  return (
    <section className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Icon + heading */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface">
            {iconMap[mode]}
          </div>
          <h1 className="text-xl font-bold text-text-primary">{titleMap[mode]}</h1>
          <p className="mt-1.5 text-sm text-text-muted">{subtitleMap[mode]}</p>
        </div>

        {/* Request reset form */}
        {mode === "request" && (
          <form onSubmit={requestReset} className="space-y-4">
            {error && <ErrorBox message={error} />}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-medium text-text-muted">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
            </button>
            <p className="text-center text-sm text-text-disabled">
              Remember it?{" "}
              <Link href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        )}

        {/* Sent confirmation */}
        {mode === "sent" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-3 text-sm text-text-muted">
              Didn&apos;t receive it? Check your spam folder, or{" "}
              <button
                type="button"
                onClick={() => { setMode("request"); setError(null) }}
                className="text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                try a different email
              </button>
              .
            </div>
            <Link
              href="/login"
              className="flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </Link>
          </div>
        )}

        {/* Set new password form */}
        {mode === "update" && (
          <form onSubmit={updatePassword} className="space-y-4">
            {error && <ErrorBox message={error} />}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-text-muted">
                New password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null) }}
                  placeholder="Min. 8 characters"
                  className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 pr-9 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-disabled hover:text-text-muted transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm" className="block text-xs font-medium text-text-muted">
                Confirm password
              </label>
              <input
                id="confirm"
                type={showPassword ? "text" : "password"}
                required
                value={confirm}
                onChange={(e) => { setConfirm(e.target.value); setError(null) }}
                placeholder="Repeat password"
                className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-disabled transition-colors focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
            </div>
            <PasswordStrength password={password} />
            <button
              type="submit"
              disabled={loading}
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-cyan-500 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </button>
          </form>
        )}

        {/* Success */}
        {mode === "done" && (
          <div className="text-center">
            <p className="mb-4 text-sm text-text-muted">
              Your password has been updated successfully.
            </p>
            <Link
              href="/portal/dashboard"
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Go to dashboard →
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
      {message}
    </div>
  )
}

function PasswordStrength({ password }: { password: string }) {
  const len = password.length
  const strength = len === 0 ? 0 : len < 8 ? 1 : len < 12 ? 2 : 3
  const barColors = ["", "bg-red-500", "bg-yellow-500", "bg-cyan-500"]
  const labelColors = ["", "text-red-400", "text-yellow-400", "text-cyan-400"]
  const labels = ["", "Weak", "Good", "Strong"]

  if (strength === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={[
              "h-1 flex-1 rounded-full transition-all duration-300",
              i <= strength ? barColors[strength] : "bg-bg-elevated",
            ].join(" ")}
          />
        ))}
      </div>
      <p className={["text-xs", labelColors[strength]].join(" ")}>{labels[strength]}</p>
    </div>
  )
}
