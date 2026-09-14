"use client"

import { useState } from "react"
import Link from "next/link"
import { CheckCircle, Zap, Globe, Bot, BarChart3, Mail, Users } from "lucide-react"

const INDUSTRIES = [
  "E-commerce",
  "SaaS",
  "Agency",
  "Real Estate",
  "Finance",
  "Healthcare",
  "Consulting",
  "Retail",
  "Other",
]

const REVENUE_RANGES = [
  { value: "under-10k", label: "Under $10k/mo" },
  { value: "10k-50k", label: "$10k – $50k/mo" },
  { value: "50k-250k", label: "$50k – $250k/mo" },
  { value: "250k-1m", label: "$250k – $1M/mo" },
  { value: "over-1m", label: "Over $1M/mo" },
]

const AUDIT_AREAS = [
  { icon: Globe, label: "Website performance", desc: "SEO, conversion rate, page speed" },
  { icon: Zap, label: "Workflow automation", desc: "Manual tasks we can automate" },
  { icon: Bot, label: "AI readiness", desc: "Where AI agents can take over" },
  { icon: Mail, label: "Email & marketing", desc: "Sequences, nurture flows, campaigns" },
  { icon: Users, label: "Lead generation", desc: "Capture, qualify, and convert" },
  { icon: BarChart3, label: "Business analytics", desc: "KPIs, reporting, dashboards" },
]

export default function AuditPage() {
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    email: "",
    company: "",
    industry: "",
    revenue: "",
    challenge: "",
  })

  function updateForm(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok) throw new Error(data.error ?? "Submission failed")
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(30,41,53,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.25)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Nav */}
      <nav className="relative z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-6 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500">
            <span className="text-xs font-bold text-bg-base">S</span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-text-primary">SYNTRA</span>
        </Link>
        <Link href="/pricing" className="text-sm text-text-muted hover:text-text-primary transition-colors">
          View pricing →
        </Link>
      </nav>

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-20">
        {submitted ? (
          <SuccessState name={form.name} />
        ) : (
          <>
            {/* Hero */}
            <div className="mb-16 text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                <span className="text-xs font-medium text-cyan-400">Free — no credit card required</span>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-text-primary md:text-6xl">
                Your free AI
                <br />
                <span className="text-cyan-400">automation audit.</span>
              </h1>
              <p className="mt-4 max-w-xl mx-auto text-lg text-text-muted">
                We&apos;ll analyze your business and show you exactly which workflows, tasks, and processes we can automate — and the revenue impact.
              </p>
            </div>

            {/* What we audit */}
            <div className="mb-16 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {AUDIT_AREAS.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-4"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
                    <Icon className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text-primary">{label}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="mx-auto max-w-xl">
              <div className="rounded-2xl border border-border-subtle bg-bg-elevated p-8">
                <h2 className="mb-6 text-xl font-bold text-text-primary">Tell us about your business</h2>

                {error && (
                  <div className="mb-6 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Your name" required>
                      <input
                        type="text"
                        required
                        placeholder="Vincent"
                        value={form.name}
                        onChange={(e) => updateForm("name", e.target.value)}
                        className="input-field"
                      />
                    </FormField>
                    <FormField label="Work email" required>
                      <input
                        type="email"
                        required
                        placeholder="you@company.com"
                        value={form.email}
                        onChange={(e) => updateForm("email", e.target.value)}
                        className="input-field"
                      />
                    </FormField>
                  </div>

                  <FormField label="Company name">
                    <input
                      type="text"
                      placeholder="Acme Inc."
                      value={form.company}
                      onChange={(e) => updateForm("company", e.target.value)}
                      className="input-field"
                    />
                  </FormField>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Industry" required>
                      <select
                        required
                        value={form.industry}
                        onChange={(e) => updateForm("industry", e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select industry</option>
                        {INDUSTRIES.map((ind) => (
                          <option key={ind} value={ind.toLowerCase().replace(/ /g, "-")}>
                            {ind}
                          </option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Monthly revenue" required>
                      <select
                        required
                        value={form.revenue}
                        onChange={(e) => updateForm("revenue", e.target.value)}
                        className="input-field"
                      >
                        <option value="">Select range</option>
                        {REVENUE_RANGES.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  </div>

                  <FormField label="Biggest operational challenge">
                    <textarea
                      rows={3}
                      placeholder="What takes the most time in your business? What do you wish was automated?"
                      value={form.challenge}
                      onChange={(e) => updateForm("challenge", e.target.value)}
                      className="input-field resize-none"
                    />
                  </FormField>

                  <button
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center rounded-xl bg-cyan-500 text-sm font-semibold text-bg-base shadow-glow-sm transition-all hover:bg-cyan-400 disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Submitting...
                      </span>
                    ) : (
                      "Get my free audit →"
                    )}
                  </button>

                  <p className="text-center text-xs text-text-disabled">
                    We&apos;ll send your audit within 24 hours. No spam, ever.
                  </p>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        .input-field {
          width: 100%;
          border-radius: 0.625rem;
          border: 1px solid #1E2935;
          background: #080A0F;
          padding: 0.625rem 0.875rem;
          font-size: 0.875rem;
          color: #F5F7FA;
          outline: none;
          transition: border-color 0.1s;
        }
        .input-field::placeholder { color: #4A5568; }
        .input-field:focus { border-color: rgba(0, 229, 255, 0.45); }
        select.input-field option { background: #0D1117; }
      `}</style>
    </div>
  )
}

function FormField({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-text-muted">
        {label}
        {required && <span className="ml-1 text-cyan-400">*</span>}
      </label>
      {children}
    </div>
  )
}

function SuccessState({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10">
        <CheckCircle className="h-10 w-10 text-cyan-400" />
      </div>
      <h2 className="mb-3 text-3xl font-bold text-text-primary">
        Audit submitted, {name.split(" ")[0]}!
      </h2>
      <p className="mb-8 max-w-sm text-text-muted">
        We&apos;re analyzing your business now. Expect a detailed automation audit in your inbox within 24 hours.
      </p>
      <div className="flex gap-3">
        <Link
          href="/pricing"
          className="flex h-10 items-center rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
        >
          View pricing →
        </Link>
        <Link
          href="/"
          className="flex h-10 items-center rounded-xl border border-border-subtle bg-bg-elevated px-6 text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
        >
          Back to home
        </Link>
      </div>
    </div>
  )
}
