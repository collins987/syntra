import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, Lock } from "lucide-react"
import { MarketingShell } from "@/components/marketing/shell"

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Real results from businesses using SYNTRA to automate and scale.",
}

const PLACEHOLDERS = [
  {
    product: "Syntra Sites",
    industry: "E-commerce",
    headline: "340% increase in organic traffic",
    detail:
      "AI-built site with continuous SEO optimisation — 90 days from zero to ranking for 200+ keywords.",
  },
  {
    product: "Syntra Flow",
    industry: "Agency",
    headline: "28 hours saved per week",
    detail:
      "Client reporting, invoicing, and CRM updates running fully autonomously. Zero manual touch points.",
  },
  {
    product: "Syntra OS",
    industry: "SaaS startup",
    headline: "Full automation stack in 14 days",
    detail:
      "Lead capture, onboarding sequences, and support triage — all automated before the product launched.",
  },
]

export default function CaseStudiesPage() {
  return (
    <MarketingShell>
      <section className="px-6 py-24">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-4 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-cyan-400">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
              Publishing as clients scale
            </span>
          </div>

          <h1 className="mb-4 text-center text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Real results. Real businesses.
          </h1>

          <p className="mx-auto mb-16 max-w-xl text-center text-base text-text-muted">
            We&apos;re in the field right now. Case studies publish as clients hit meaningful
            milestones — not before. No fabricated numbers, no vanity metrics.
          </p>

          {/* Locked placeholder cards */}
          <div className="grid gap-6 md:grid-cols-3">
            {PLACEHOLDERS.map((item) => (
              <div
                key={item.product}
                className="relative overflow-hidden rounded-xl border border-border-subtle bg-bg-surface p-6"
              >
                {/* Lock badge */}
                <div className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated">
                  <Lock className="h-3 w-3 text-text-disabled" />
                </div>

                {/* Dimmed content */}
                <div className="select-none opacity-50">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                    {item.product}
                  </span>
                  <div className="mt-1.5">
                    <span className="rounded border border-border-subtle px-1.5 py-0.5 text-[10px] text-text-disabled">
                      {item.industry}
                    </span>
                  </div>
                  <h3 className="mt-3 text-base font-bold leading-snug text-text-primary">
                    {item.headline}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-muted">{item.detail}</p>
                </div>

                {/* Status pill */}
                <div className="mt-5 rounded-lg border border-dashed border-border-subtle bg-bg-elevated/50 px-3 py-2 text-center">
                  <p className="text-[11px] text-text-disabled">In progress</p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA block */}
          <div className="mt-16 rounded-2xl border border-border-subtle bg-bg-surface px-8 py-12 text-center">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
              Want to be featured?
            </p>
            <h2 className="mb-3 text-2xl font-bold text-text-primary md:text-3xl">
              Become one of our first case studies.
            </h2>
            <p className="mx-auto mb-8 max-w-sm text-sm text-text-muted">
              Get a free automation audit. If we can build something great together, your
              results go up on this page — with your name on them.
            </p>
            <Link
              href="/audit"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-cyan-500 px-8 text-sm font-semibold text-bg-base shadow-glow hover:bg-cyan-400 transition-colors"
            >
              Get your free audit <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-4 text-xs text-text-disabled">
              No commitment. No sales call unless you want one.
            </p>
          </div>

        </div>
      </section>
    </MarketingShell>
  )
}
