import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import { PLANS, CAPABILITIES, getPlan } from "@/lib/pricing"

export const metadata: Metadata = {
  title: "SYNTRA | Build. Automate. Scale.",
  description:
    "SYNTRA runs the repetitive parts of your business. We build and manage your website, marketing and daily operations so your team can focus on growth.",
}

const CORE = PLANS.filter((p) => p.id !== "os")
const OS = getPlan("os")!

// What we commit to — not traction claims.
const COMMITMENTS = [
  { value: "48 hrs", label: "From signup to live site" },
  { value: "24/7", label: "Your systems keep running" },
  { value: "Monthly", label: "Improvements, not just upkeep" },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(30,41,53,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.25)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Nav */}
      <nav className="relative z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-6 backdrop-blur-sm">
        <div className="flex items-center">
          <Image src="/logo.png" alt="SYNTRA" width={40} height={40} className="h-10 w-auto" priority />
        </div>
        <div className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          <a href="/services" className="hover:text-text-primary transition-colors">Services</a>
          <a href="/pricing" className="hover:text-text-primary transition-colors">Pricing</a>
          <a href="/case-studies" className="hover:text-text-primary transition-colors">Case Studies</a>
          <a href="/about" className="hover:text-text-primary transition-colors">About</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
            Sign in
          </Link>
          <Link
            href="/audit"
            className="flex h-8 items-center rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
          >
            Get free audit →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center justify-center px-6 py-32 text-center">
        <div className="mb-4 flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span className="text-xs font-medium text-cyan-400">Systems running</span>
        </div>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-text-primary md:text-7xl">
          BUILD THE
          <br />
          <span className="text-cyan-400">AUTONOMOUS</span>
          <br />
          BUSINESS.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          We run your website, marketing and daily operations, so your team can focus on growth.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/audit"
            className="flex h-11 items-center rounded-lg bg-cyan-500 px-8 text-base font-semibold text-bg-base shadow-glow hover:bg-cyan-400 transition-colors"
          >
            Get your free audit →
          </Link>
          <Link
            href="/services"
            className="flex h-11 items-center rounded-lg border border-border px-8 text-base text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
          >
            See what we handle
          </Link>
        </div>

        {/* Commitments */}
        <div className="mt-20 grid grid-cols-1 gap-12 border-t border-border-subtle pt-12 sm:grid-cols-3">
          {COMMITMENTS.map((c) => (
            <div key={c.label} className="text-center">
              <p className="text-2xl font-semibold text-text-primary">{c.value}</p>
              <p className="mt-1 text-sm text-text-muted">{c.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Core services */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-text-disabled">
            What we handle
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
            Three services. Pick where it hurts most.
          </h2>

          <div className="grid gap-5 md:grid-cols-3">
            {CORE.map((s) => (
              <Link
                key={s.id}
                href="/services"
                className="group flex flex-col rounded-lg border border-border-subtle bg-bg-surface p-6 transition-all duration-200 hover:border-cyan-500/30 hover:shadow-glow"
              >
                <h3 className="text-base font-semibold text-text-primary">{s.name}</h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{s.summary}</p>

                <div className="mt-6 flex items-baseline gap-2 border-t border-border-subtle pt-4">
                  <span className="text-lg font-semibold tabular-nums text-text-primary">
                    ${s.priceUsd}
                    <span className="text-xs font-normal text-text-disabled">/mo</span>
                  </span>
                  <span className="text-xs tabular-nums text-text-disabled">
                    KES {s.priceKes.toLocaleString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Capabilities — deliberately lighter than the service cards above:
              they are part of every plan, not something you buy separately. */}
          <div className="mt-14">
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px flex-1 bg-border-subtle" />
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                Included in every plan
              </span>
              <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <div className="grid divide-y divide-border-subtle rounded-lg border border-border-subtle bg-bg-elevated/40 md:grid-cols-2 md:divide-x md:divide-y-0">
              {CAPABILITIES.map((c) => (
                <div key={c.id} className="p-6">
                  <h3 className="text-base font-semibold text-text-primary">{c.name}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{c.summary}</p>
                </div>
              ))}
            </div>
          </div>

          {/* OS — the destination tier */}
          <div className="mt-14">
            <div className="mb-5 flex items-center gap-4">
              <span className="h-px flex-1 bg-border-subtle" />
              <span className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                Or take all three
              </span>
              <span className="h-px flex-1 bg-border-subtle" />
            </div>

            <Link
              href="/pricing"
              className="group flex flex-col gap-6 rounded-lg border border-cyan-500/40 bg-cyan-500/5 p-7 transition-all hover:border-cyan-500/70 hover:shadow-glow md:flex-row md:items-center md:justify-between md:gap-10"
            >
              <div className="max-w-xl">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <h3 className="text-lg font-semibold text-text-primary">{OS.name}</h3>
                  <span className="rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg-base">
                    {OS.badge}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-text-muted">{OS.summary}</p>
              </div>

              <div className="shrink-0 md:text-right">
                <p className="text-3xl font-bold tabular-nums text-text-primary">
                  ${OS.priceUsd}
                  <span className="text-sm font-normal text-text-disabled">/mo</span>
                </p>
                <p className="text-xs tabular-nums text-text-disabled">
                  KES {OS.priceKes.toLocaleString()}/mo
                </p>
                <p className="mt-2 text-xs font-medium text-cyan-400">
                  Save ${CORE.reduce((n, s) => n + s.priceUsd, 0) - OS.priceUsd}/mo vs. buying separately
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-text-primary">
          Find out what you could stop doing
        </h2>
        <p className="mt-4 text-text-muted">
          Take the free audit. We&apos;ll show you which tasks we&apos;d take off your plate first.
        </p>
        <Link
          href="/audit"
          className="mt-8 inline-flex h-11 items-center rounded-lg bg-cyan-500 px-10 text-base font-semibold text-bg-base shadow-glow hover:bg-cyan-400 transition-colors"
        >
          Get your free audit →
        </Link>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-subtle px-6 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between text-xs text-text-disabled">
          <span>© 2026 SYNTRA LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <a href="/legal/privacy" className="hover:text-text-muted transition-colors">Privacy</a>
            <a href="/legal/terms" className="hover:text-text-muted transition-colors">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
