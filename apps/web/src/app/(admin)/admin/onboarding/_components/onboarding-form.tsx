"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Check } from "lucide-react"

import type { ClientServiceKey } from "@syntra/db"

const SERVICE_OPTIONS: Array<{ key: ClientServiceKey; label: string; description: string }> = [
  { key: "website", label: "Websites", description: "Status + change requests" },
  { key: "automations", label: "Automations", description: "n8n workflow cards" },
  { key: "monitoring", label: "Monitoring", description: "Uptime + action log" },
  { key: "support", label: "Support", description: "Request intake + ticketing" },
  { key: "reports", label: "Reports", description: "Monthly summaries" },
  { key: "billing", label: "Billing", description: "Stripe + invoices" },
  { key: "hermes", label: "Hermes", description: "AI assistant (phase 7)" },
]

const DEFAULT_ON: ClientServiceKey[] = [
  "website",
  "automations",
  "monitoring",
  "support",
  "reports",
  "billing",
]

export function OnboardingForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [services, setServices] = useState<Set<ClientServiceKey>>(new Set(DEFAULT_ON))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<
    | { user_id: string; invite_sent: boolean; full_name: string }
    | null
  >(null)

  function toggleService(key: ClientServiceKey) {
    setServices((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
        services: Array.from(services),
      }),
    })

    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      user_id?: string
      invite_sent?: boolean
      error?: string
    }

    setLoading(false)
    if (!res.ok || !payload.ok || !payload.user_id) {
      setError(payload.error ?? "Failed to create client.")
      return
    }
    setSuccess({
      user_id: payload.user_id,
      invite_sent: payload.invite_sent ?? false,
      full_name: fullName.trim(),
    })
    router.refresh()
  }

  if (success) {
    return (
      <div className="rounded-xl border border-success-500/20 bg-success-500/5 p-6">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-success-500/15 text-success-400">
            <Check className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold text-text-primary">
              {success.full_name} is onboarded.
            </p>
            <p className="text-xs text-text-muted">
              {success.invite_sent
                ? "Activation email sent — 30-minute window."
                : "Account created, but the invite email didn't send. Resend from the client detail page."}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            href={`/admin/clients/${success.user_id}`}
            className="flex h-9 items-center rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base transition hover:bg-cyan-400"
          >
            Open client detail
          </Link>
          <button
            type="button"
            onClick={() => {
              setSuccess(null)
              setFullName("")
              setEmail("")
              setPhone("")
              setCompanyName("")
              setServices(new Set(DEFAULT_ON))
            }}
            className="flex h-9 items-center rounded-md border border-border-subtle px-4 text-sm text-text-secondary transition hover:text-text-primary"
          >
            Create another
          </button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id="full_name"
          label="Full name"
          value={fullName}
          onChange={setFullName}
          required
          placeholder="Jane Doe"
        />
        <Field
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          required
          placeholder="jane@example.com"
        />
        <Field
          id="phone"
          label="Phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          placeholder="Optional"
        />
        <Field
          id="company_name"
          label="Company"
          value={companyName}
          onChange={setCompanyName}
          placeholder="Optional"
        />
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-text-secondary">Services</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {SERVICE_OPTIONS.map((opt) => {
            const checked = services.has(opt.key)
            return (
              <label
                key={opt.key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
                  checked
                    ? "border-cyan-500/40 bg-cyan-500/5"
                    : "border-border-subtle bg-bg-elevated hover:border-border"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleService(opt.key)}
                  className="mt-0.5 h-4 w-4 accent-cyan-500"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-primary">{opt.label}</span>
                  <span className="block text-xs text-text-muted">{opt.description}</span>
                </span>
              </label>
            )
          })}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || services.size === 0 || !fullName || !email}
          className="flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create client + send invite"}
        </button>
        <p className="text-xs text-text-disabled">
          A one-time 30-minute magic link is emailed on submit.
        </p>
      </div>
    </form>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}

function Field({ id, label, value, onChange, type = "text", required, placeholder }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
        {required && <span className="ml-0.5 text-error-400">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />
    </div>
  )
}
