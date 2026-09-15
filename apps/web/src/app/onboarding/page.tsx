"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Globe, Zap, Bot, Layers, ChevronRight, Check } from "lucide-react"

const STEPS = ["Business", "Service", "Goals", "Launch"]

const SERVICES = [
  {
    id: "sites",
    label: "Syntra Sites",
    desc: "AI-generated website with continuous SEO optimization",
    icon: Globe,
  },
  {
    id: "flow",
    label: "Syntra Flow",
    desc: "Autonomous workflows, CRM sync, and email sequences",
    icon: Zap,
  },
  {
    id: "ai",
    label: "Syntra AI",
    desc: "Dedicated AI agents (Ava, Max, Leo) for your business",
    icon: Bot,
  },
  {
    id: "os",
    label: "Syntra OS",
    desc: "Complete AI operating system — websites + flows + agents",
    icon: Layers,
  },
]

const INDUSTRIES = [
  "E-commerce", "SaaS", "Agency", "Real Estate",
  "Finance", "Healthcare", "Consulting", "Retail", "Other",
]

export default function OnboardingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()

  // Stripe flow
  const sessionId = searchParams.get("session_id")
  // Flutterwave flow
  const txRef = searchParams.get("tx_ref")
  const flwTxId = searchParams.get("flw_tx_id")
  const preselectedPlan = searchParams.get("plan") ?? ""

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    orgName: "",
    orgSlug: "",
    industry: "",
    serviceType: preselectedPlan,
    projectName: "",
    goals: "",
  })

  // Auto-generate slug from org name
  useEffect(() => {
    const slug = form.orgName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 48)
    setForm((prev) => ({ ...prev, orgSlug: slug }))
  }, [form.orgName])

  function update(key: keyof typeof form, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function canAdvance(): boolean {
    if (step === 0) return form.orgName.length >= 2 && form.industry.length > 0
    if (step === 1) return form.serviceType.length > 0
    if (step === 2) return true
    return false
  }

  function next() {
    if (canAdvance() && step < STEPS.length - 1) setStep((s) => s + 1)
  }

  async function handleLaunch() {
    setLoading(true)
    setError(null)
    try {
      // 1. Create org + membership + project
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = (await res.json()) as { orgId?: string; error?: string }
      if (!res.ok || !data.orgId) throw new Error(data.error ?? "Setup failed")

      // 2a. Stripe flow — link subscription via session_id
      if (sessionId) {
        const linkRes = await fetch("/api/stripe/link-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, orgId: data.orgId }),
        })
        if (!linkRes.ok) {
          console.warn("[onboarding] Failed to link Stripe subscription")
        }
      }

      // 2b. Flutterwave flow — link subscription via tx_ref
      if (txRef && flwTxId) {
        const linkRes = await fetch("/api/flutterwave/link-subscription", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ txRef, flwTxId, orgId: data.orgId }),
        })
        if (!linkRes.ok) {
          console.warn("[onboarding] Failed to link Flutterwave subscription")
        }
      }

      router.push("/portal/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-12 flex items-center gap-2.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500">
          <span className="text-sm font-bold text-bg-base">S</span>
        </div>
        <span className="text-base font-semibold tracking-wide text-text-primary">SYNTRA</span>
      </div>

      {/* Step indicator */}
      <div className="mb-10 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={[
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                i < step
                  ? "bg-cyan-500 text-bg-base"
                  : i === step
                  ? "border-2 border-cyan-500 text-cyan-400"
                  : "border border-border-subtle text-text-disabled",
              ].join(" ")}
            >
              {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <span
              className={[
                "text-xs font-medium",
                i === step ? "text-text-primary" : "text-text-disabled",
              ].join(" ")}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight className="h-3.5 w-3.5 text-border-strong mx-1" />
            )}
          </div>
        ))}
      </div>

      {/* Card */}
      <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-bg-elevated p-8">
        {error && (
          <div className="mb-6 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-sm text-error-400">
            {error}
          </div>
        )}

        {step === 0 && <StepBusiness form={form} update={update} />}
        {step === 1 && <StepService form={form} update={update} />}
        {step === 2 && <StepGoals form={form} update={update} />}
        {step === 3 && <StepLaunch form={form} sessionId={sessionId} txRef={txRef} />}

        {/* Actions */}
        <div className="mt-8 flex items-center justify-between">
          {step > 0 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              ← Back
            </button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className="flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-bg-base shadow-glow-sm transition-all hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={loading}
              className="flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-8 text-sm font-semibold text-bg-base shadow-glow-sm transition-all hover:bg-cyan-400 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Launching...
                </>
              ) : (
                <>Launch SYNTRA</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step components ───────────────────────────────────────────────────────────

type FormKey = "orgName" | "orgSlug" | "industry" | "serviceType" | "projectName" | "goals"
type UpdateFn = (key: FormKey, value: string) => void

function StepBusiness({
  form,
  update,
}: {
  form: { orgName: string; orgSlug: string; industry: string }
  update: UpdateFn
}) {
  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-text-primary">Welcome to SYNTRA.</h2>
      <p className="mb-6 text-sm text-text-muted">
        Let&apos;s set up your AI operating system. This takes about 2 minutes.
      </p>
      <div className="space-y-4">
        <Field label="Business name" required>
          <input
            type="text"
            required
            autoFocus
            placeholder="Acme Inc."
            value={form.orgName}
            onChange={(e) => update("orgName", e.target.value)}
            className="onb-input"
          />
        </Field>
        <Field label="Workspace URL">
          <div className="flex items-center rounded-xl border border-border-subtle bg-bg-base focus-within:border-cyan-500/45 transition-colors">
            <span className="pl-3 text-sm text-text-disabled">syntra.io/</span>
            <input
              type="text"
              value={form.orgSlug}
              onChange={(e) => update("orgSlug", e.target.value)}
              className="flex-1 bg-transparent py-2.5 pr-3 text-sm text-text-primary outline-none"
            />
          </div>
        </Field>
        <Field label="Industry" required>
          <select
            required
            value={form.industry}
            onChange={(e) => update("industry", e.target.value)}
            className="onb-input"
          >
            <option value="">Select your industry</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind.toLowerCase().replace(/ /g, "-")}>
                {ind}
              </option>
            ))}
          </select>
        </Field>
      </div>
    </div>
  )
}

function StepService({
  form,
  update,
}: {
  form: { serviceType: string }
  update: UpdateFn
}) {
  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-text-primary">What can we automate first?</h2>
      <p className="mb-6 text-sm text-text-muted">Choose your starting point. You can add more services later.</p>
      <div className="grid gap-3">
        {SERVICES.map(({ id, label, desc, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => update("serviceType", id)}
            className={[
              "flex items-center gap-4 rounded-xl border px-4 py-3.5 text-left transition-all",
              form.serviceType === id
                ? "border-cyan-500/50 bg-cyan-500/[0.05]"
                : "border-border-subtle bg-bg-surface hover:border-border",
            ].join(" ")}
          >
            <div
              className={[
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border",
                form.serviceType === id
                  ? "border-cyan-500/40 bg-cyan-500/10"
                  : "border-border-subtle bg-bg-elevated",
              ].join(" ")}
            >
              <Icon
                className={["h-4.5 w-4.5", form.serviceType === id ? "text-cyan-400" : "text-text-muted"].join(" ")}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={[
                  "text-sm font-semibold",
                  form.serviceType === id ? "text-cyan-400" : "text-text-primary",
                ].join(" ")}
              >
                {label}
              </p>
              <p className="mt-0.5 text-xs text-text-muted">{desc}</p>
            </div>
            {form.serviceType === id && (
              <Check className="h-4 w-4 shrink-0 text-cyan-400" />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

function StepGoals({
  form,
  update,
}: {
  form: { projectName: string; goals: string; orgName: string; serviceType: string }
  update: UpdateFn
}) {
  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-text-primary">Tell us your goals.</h2>
      <p className="mb-6 text-sm text-text-muted">This helps us configure your automations from day one.</p>
      <div className="space-y-4">
        <Field label="Project name">
          <input
            type="text"
            placeholder={`${form.orgName || "My Business"} — ${form.serviceType || "Automation"}`}
            value={form.projectName}
            onChange={(e) => update("projectName", e.target.value)}
            className="onb-input"
          />
        </Field>
        <Field label="What&apos;s your biggest operational bottleneck?">
          <textarea
            rows={4}
            placeholder="e.g. We spend 10 hours a week manually qualifying leads and following up with prospects..."
            value={form.goals}
            onChange={(e) => update("goals", e.target.value)}
            className="onb-input resize-none"
          />
        </Field>
      </div>
    </div>
  )
}

function StepLaunch({
  form,
  sessionId,
  txRef,
}: {
  form: { orgName: string; serviceType: string; orgSlug: string }
  sessionId: string | null
  txRef: string | null
}) {
  const service = SERVICES.find((s) => s.id === form.serviceType)
  const hasPaid = sessionId ?? txRef
  const paymentLabel = txRef ? "M-Pesa payment confirmed ✓" : "Subscription confirmed ✓"
  return (
    <div>
      <h2 className="mb-1 text-2xl font-bold text-text-primary">Ready to launch.</h2>
      <p className="mb-6 text-sm text-text-muted">
        Your AI operating system is configured. Click launch to activate.
      </p>
      <div className="space-y-3 rounded-xl border border-border-subtle bg-bg-surface p-4">
        <SummaryRow label="Organization" value={form.orgName || "—"} />
        <SummaryRow label="Workspace" value={form.orgSlug ? `syntra.io/${form.orgSlug}` : "—"} />
        <SummaryRow label="Starting with" value={service?.label ?? "—"} highlight />
        {hasPaid && <SummaryRow label="Payment" value={paymentLabel} highlight />}
      </div>
      <p className="mt-4 text-xs text-text-disabled text-center">
        You&apos;ll be redirected to your command center immediately after launch.
      </p>
    </div>
  )
}

function SummaryRow({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-disabled">{label}</span>
      <span
        className={["text-sm font-medium", highlight ? "text-cyan-400" : "text-text-primary"].join(" ")}
      >
        {value}
      </span>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

// Inline styles via JSX global — avoids needing a separate CSS file
const styles = `
  .onb-input {
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
  .onb-input::placeholder { color: #4A5568; }
  .onb-input:focus { border-color: rgba(0, 229, 255, 0.45); }
  select.onb-input option { background: #0D1117; }
`

// Inject styles — minimal, no CSS-in-JS dependency
if (typeof document !== "undefined") {
  const id = "onb-styles"
  if (!document.getElementById(id)) {
    const el = document.createElement("style")
    el.id = id
    el.textContent = styles
    document.head.appendChild(el)
  }
}
