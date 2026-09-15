"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSearchParams } from "next/navigation"
import { PLANS } from "@/lib/pricing"
import { Check, CreditCard, Smartphone } from "lucide-react"

const KES_PRICES: Record<string, number> = {
  sites: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_SITES_KES ?? "38700"),
  flow: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_FLOW_KES ?? "64700"),
  os: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_OS_KES ?? "129700"),
}

type PayMethod = "card" | "mpesa"

export default function PricingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [payMethod, setPayMethod] = useState<PayMethod>("card")
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(
    urlError === "payment_failed" ? "Payment was not completed. Please try again." :
    urlError === "payment_cancelled" ? "Payment was cancelled." :
    urlError === "verification_failed" ? "Payment verification failed. Contact support." :
    urlError === "amount_mismatch" ? "Payment amount mismatch. Contact support." :
    null
  )

  async function handleStripeCheckout(priceId: string, planId: string) {
    setLoading(planId)
    setError(null)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        if (res.status === 401) { router.push(`/login?next=/pricing`); return }
        throw new Error(data.error ?? "Checkout failed")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(null)
    }
  }

  async function handleMpesaCheckout(planId: string) {
    setLoading(planId)
    setError(null)
    try {
      const res = await fetch("/api/flutterwave/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      })
      const data = (await res.json()) as { url?: string; error?: string }
      if (!res.ok || !data.url) {
        if (res.status === 401) { router.push(`/login?next=/pricing`); return }
        throw new Error(data.error ?? "Checkout failed")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setLoading(null)
    }
  }

  function handleCheckout(priceId: string, planId: string) {
    if (payMethod === "mpesa") return handleMpesaCheckout(planId)
    return handleStripeCheckout(priceId, planId)
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Background grid */}
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
              onClick={() => setPayMethod("card")}
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
              onClick={() => setPayMethod("mpesa")}
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

        {payMethod === "mpesa" && (
          <p className="mb-8 text-center text-sm text-text-muted">
            Prices shown in Kenya Shillings (KES). You&apos;ll receive an M-Pesa STK push to confirm payment.
          </p>
        )}

        {/* Error */}
        {error && (
          <div className="mb-8 mx-auto max-w-md rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3 text-center text-sm text-error-400">
            {error}
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

              {/* Plan name */}
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

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-3">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5 text-sm text-text-muted">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-cyan-400" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleCheckout(plan.priceId, plan.id)}
                disabled={loading === plan.id}
                className={[
                  "flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all",
                  plan.popular
                    ? "bg-cyan-500 text-bg-base shadow-glow-sm hover:bg-cyan-400 disabled:opacity-60"
                    : "border border-border bg-bg-surface text-text-primary hover:border-border-strong hover:bg-bg-elevated disabled:opacity-60",
                ].join(" ")}
              >
                {loading === plan.id ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Redirecting...
                  </>
                ) : payMethod === "mpesa" ? (
                  <>
                    <Smartphone className="h-4 w-4" />
                    Pay with M-Pesa
                  </>
                ) : (
                  plan.cta
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center space-y-2">
          <p className="text-sm text-text-disabled">
            All plans billed monthly. Cancel anytime.{" "}
            <Link href="/audit" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Not sure? Get a free audit →
            </Link>
          </p>
          {payMethod === "mpesa" && (
            <p className="text-xs text-text-disabled">
              M-Pesa payments processed by Flutterwave. KES prices include all fees.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
