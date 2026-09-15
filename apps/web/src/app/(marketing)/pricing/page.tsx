"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { PLANS } from "@/lib/pricing"
import { Check, CreditCard, Smartphone, X, Loader2, CheckCircle2, AlertCircle } from "lucide-react"

const KES_PRICES: Record<string, number> = {
  sites: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_SITES_KES ?? "38700"),
  flow: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_FLOW_KES ?? "64700"),
  os: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_OS_KES ?? "129700"),
}

type PayMethod = "card" | "mpesa"
type MpesaStep = "idle" | "phone" | "pending" | "polling" | "success" | "failed"

interface MpesaState {
  step: MpesaStep
  phone: string
  planId: string
  invoiceId: string | null
  apiRef: string | null
  error: string | null
}

const MPESA_INIT: MpesaState = {
  step: "idle",
  phone: "",
  planId: "",
  invoiceId: null,
  apiRef: null,
  error: null,
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-base" />}>
      <PricingContent />
    </Suspense>
  )
}

function PricingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [payMethod, setPayMethod] = useState<PayMethod>("card")
  const [stripeLoading, setStripeLoading] = useState<string | null>(null)
  const [stripeError, setStripeError] = useState<string | null>(
    urlError === "payment_failed" ? "Payment failed. Please try again." :
    urlError === "payment_cancelled" ? "Payment was cancelled." :
    urlError === "verification_failed" ? "Payment verification failed. Contact support." :
    null
  )

  const [mpesa, setMpesa] = useState<MpesaState>(MPESA_INIT)

  // ── Stripe ──────────────────────────────────────────────────────────────────
  async function handleStripeCheckout(priceId: string, planId: string) {
    setStripeLoading(planId)
    setStripeError(null)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        if (res.status === 401) { router.push("/login?next=/pricing"); return }
        throw new Error(data.error ?? "Checkout failed")
      }
      window.location.href = data.url
    } catch (err) {
      setStripeError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setStripeLoading(null)
    }
  }

  // ── M-Pesa ──────────────────────────────────────────────────────────────────
  function openMpesaPhone(planId: string) {
    setMpesa({ ...MPESA_INIT, step: "phone", planId })
  }

  async function submitMpesaPhone() {
    if (!mpesa.phone.trim()) return
    setMpesa((s) => ({ ...s, step: "pending", error: null }))

    try {
      const res = await fetch("/api/intasend/stk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: mpesa.planId, phone: mpesa.phone }),
      })
      const data = (await res.json()) as {
        invoiceId?: string
        apiRef?: string
        error?: string
      }
      if (!res.ok || !data.invoiceId) {
        if (res.status === 401) { router.push("/login?next=/pricing"); return }
        throw new Error(data.error ?? "Failed to send payment request")
      }
      setMpesa((s) => ({
        ...s,
        step: "polling",
        invoiceId: data.invoiceId!,
        apiRef: data.apiRef!,
      }))
      pollPaymentStatus(data.invoiceId!, data.apiRef!, mpesa.planId)
    } catch (err) {
      setMpesa((s) => ({
        ...s,
        step: "phone",
        error: err instanceof Error ? err.message : "Something went wrong",
      }))
    }
  }

  async function pollPaymentStatus(invoiceId: string, apiRef: string, planId: string) {
    const MAX_POLLS = 24  // 2 min at 5s intervals
    let count = 0

    const tick = async () => {
      if (count >= MAX_POLLS) {
        setMpesa((s) => ({
          ...s,
          step: "failed",
          error: "Payment timed out. If you were charged, contact support.",
        }))
        return
      }
      count++

      try {
        const res = await fetch(`/api/intasend/status?invoice_id=${invoiceId}`)
        const data = (await res.json()) as {
          state?: string
          failedReason?: string
        }

        if (data.state === "COMPLETE") {
          setMpesa((s) => ({ ...s, step: "success" }))
          setTimeout(() => {
            router.push(
              `/onboarding?intasend_ref=${encodeURIComponent(apiRef)}&invoice_id=${encodeURIComponent(invoiceId)}&plan=${planId}`
            )
          }, 1500)
          return
        }

        if (data.state === "FAILED" || data.state === "CANCELED") {
          setMpesa((s) => ({
            ...s,
            step: "failed",
            error: data.failedReason ?? "Payment declined. Please try again.",
          }))
          return
        }

        // PENDING or PROCESSING — keep polling
        setTimeout(tick, 5000)
      } catch {
        setTimeout(tick, 5000)  // network hiccup, retry
      }
    }

    setTimeout(tick, 3000)  // first check after 3s (give phone time to prompt)
  }

  function resetMpesa() {
    setMpesa(MPESA_INIT)
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  const mpesaOverlayPlanId = mpesa.step !== "idle" ? mpesa.planId : null

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
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/audit"
            className="flex h-8 items-center rounded-md border border-border-subtle bg-bg-elevated px-4 text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
          >
            Free audit
          </Link>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-20">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-xs font-medium text-cyan-400">Simple, transparent pricing</span>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-text-primary md:text-6xl">
            Choose your
            <br />
            <span className="text-cyan-400">AI advantage.</span>
          </h1>
          <p className="mt-4 text-lg text-text-muted">
            Every plan includes a dedicated client portal, real-time monitoring, and SYNTRA&apos;s autonomous AI layer.
          </p>
        </div>

        {/* Payment method toggle */}
        <div className="mb-10 flex justify-center">
          <div className="flex rounded-xl border border-border-subtle bg-bg-elevated p-1">
            <button
              onClick={() => { setPayMethod("card"); resetMpesa() }}
              className={[
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
                payMethod === "card"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              <CreditCard className="h-4 w-4" />
              Pay with Card
            </button>
            <button
              onClick={() => { setPayMethod("mpesa"); setStripeError(null) }}
              className={[
                "flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all",
                payMethod === "mpesa"
                  ? "bg-bg-surface text-text-primary shadow-sm"
                  : "text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              <Smartphone className="h-4 w-4" />
              M-Pesa
              <span className="text-[10px]">🇰🇪</span>
            </button>
          </div>
        </div>

        {payMethod === "mpesa" && mpesa.step === "idle" && (
          <p className="mb-8 text-center text-sm text-text-muted">
            You&apos;ll receive an M-Pesa prompt on your phone to confirm. No redirect — pay right here.
          </p>
        )}

        {/* Stripe error */}
        {stripeError && payMethod === "card" && (
          <div className="mb-8 mx-auto max-w-md rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-center text-sm text-error-400">
            {stripeError}
          </div>
        )}

        {/* Plan cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={[
                "relative flex flex-col rounded-2xl border p-8 transition-all",
                plan.popular
                  ? "border-cyan-500/50 bg-cyan-500/[0.04] shadow-[0_0_40px_rgba(0,229,255,0.07)]"
                  : "border-border-subtle bg-bg-elevated hover:border-border",
              ].join(" ")}
            >
              {plan.popular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-cyan-500 px-4 py-1 text-[11px] font-bold tracking-wider text-bg-base">
                    MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold text-text-primary">{plan.name}</h2>
                <p className="mt-1 text-sm text-text-muted">{plan.tagline}</p>
              </div>

              {/* Price */}
              <div className="mb-8">
                {payMethod === "card" ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-5xl font-bold tabular-nums text-text-primary">
                      ${plan.price}
                    </span>
                    <span className="text-sm text-text-disabled">/mo</span>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-medium text-text-disabled">KES</span>
                      <span className="text-5xl font-bold tabular-nums text-text-primary">
                        {(KES_PRICES[plan.id] ?? 0).toLocaleString()}
                      </span>
                      <span className="text-sm text-text-disabled">/mo</span>
                    </div>
                    <p className="mt-1 text-xs text-text-disabled">≈ ${plan.price} USD</p>
                  </div>
                )}
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA — card */}
              {payMethod === "card" && (
                <button
                  onClick={() => handleStripeCheckout(plan.priceId, plan.id)}
                  disabled={stripeLoading === plan.id}
                  className={[
                    "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                    plan.popular
                      ? "bg-cyan-500 text-bg-base shadow-glow-sm hover:bg-cyan-400 disabled:opacity-60"
                      : "border border-border bg-bg-surface text-text-primary hover:border-border-strong hover:bg-bg-elevated disabled:opacity-60",
                  ].join(" ")}
                >
                  {stripeLoading === plan.id ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Redirecting...</>
                  ) : plan.cta}
                </button>
              )}

              {/* CTA — M-Pesa: idle or other plan's flow active */}
              {payMethod === "mpesa" && mpesaOverlayPlanId !== plan.id && (
                <button
                  onClick={() => openMpesaPhone(plan.id)}
                  disabled={mpesaOverlayPlanId !== null}
                  className={[
                    "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                    plan.popular
                      ? "bg-cyan-500 text-bg-base shadow-glow-sm hover:bg-cyan-400 disabled:opacity-40"
                      : "border border-border bg-bg-surface text-text-primary hover:border-border-strong hover:bg-bg-elevated disabled:opacity-40",
                  ].join(" ")}
                >
                  <Smartphone className="h-4 w-4" />
                  Pay with M-Pesa
                </button>
              )}

              {/* M-Pesa inline flow for the active plan */}
              {payMethod === "mpesa" && mpesaOverlayPlanId === plan.id && (
                <MpesaFlow
                  mpesa={mpesa}
                  setMpesa={setMpesa}
                  submitPhone={submitMpesaPhone}
                  onCancel={resetMpesa}
                  popular={plan.popular === true}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mt-16 text-center space-y-2">
          <p className="text-sm text-text-disabled">
            All plans billed monthly. Cancel anytime.{" "}
            <Link href="/audit" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Not sure? Get a free audit →
            </Link>
          </p>
          {payMethod === "mpesa" && (
            <p className="text-xs text-text-disabled">
              M-Pesa payments processed by IntaSend. Prices in Kenya Shillings, all fees included.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── M-Pesa inline flow component ─────────────────────────────────────────────

function MpesaFlow({
  mpesa,
  setMpesa,
  submitPhone,
  onCancel,
  popular,
}: {
  mpesa: MpesaState
  setMpesa: React.Dispatch<React.SetStateAction<MpesaState>>
  submitPhone: () => void | Promise<void>
  onCancel: () => void
  popular: boolean
}) {
  if (mpesa.step === "phone") {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-surface px-3 py-2.5 focus-within:border-cyan-500/40 transition-colors">
          <span className="text-sm text-text-disabled shrink-0">🇰🇪 +254</span>
          <input
            type="tel"
            autoFocus
            placeholder="712 345 678"
            value={mpesa.phone}
            onChange={(e) => setMpesa((s) => ({ ...s, phone: e.target.value }))}
            onKeyDown={(e) => e.key === "Enter" && submitPhone()}
            className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-disabled"
          />
        </div>
        {mpesa.error && (
          <p className="flex items-start gap-1.5 text-xs text-error-400">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {mpesa.error}
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={submitPhone}
            className={[
              "flex flex-1 h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
              popular
                ? "bg-cyan-500 text-bg-base shadow-glow-sm hover:bg-cyan-400"
                : "border border-border bg-bg-elevated text-text-primary hover:border-border-strong",
            ].join(" ")}
          >
            <Smartphone className="h-4 w-4" />
            Send M-Pesa Prompt
          </button>
          <button
            onClick={onCancel}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-center text-[11px] text-text-disabled">
          We&apos;ll send an M-Pesa STK push to your phone. Enter your PIN to pay.
        </p>
      </div>
    )
  }

  if (mpesa.step === "pending" || mpesa.step === "polling") {
    return (
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
        <p className="text-sm font-medium text-text-primary">
          {mpesa.step === "pending" ? "Sending payment request…" : "Waiting for your M-Pesa PIN…"}
        </p>
        <p className="text-xs text-text-muted">
          Check your phone and enter your M-Pesa PIN to confirm.
        </p>
        <button
          onClick={onCancel}
          className="mt-1 text-xs text-text-disabled hover:text-text-muted transition-colors underline underline-offset-2"
        >
          Cancel
        </button>
      </div>
    )
  }

  if (mpesa.step === "success") {
    return (
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <CheckCircle2 className="h-8 w-8 text-success-400" />
        <p className="text-sm font-semibold text-success-400">Payment confirmed!</p>
        <p className="text-xs text-text-muted">Taking you to onboarding…</p>
      </div>
    )
  }

  if (mpesa.step === "failed") {
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-3 py-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
          <p className="text-xs text-error-400">{mpesa.error}</p>
        </div>
        <button
          onClick={onCancel}
          className="flex h-10 w-full items-center justify-center rounded-xl border border-border-subtle bg-bg-surface text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
        >
          Try again
        </button>
      </div>
    )
  }

  return null
}
