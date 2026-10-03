import Link from "next/link"
import { Globe, Zap, Megaphone } from "lucide-react"
import { MarketingShell } from "@/components/marketing/shell"
import { PLANS, CAPABILITIES, getPlan, type PlanId } from "@/lib/pricing"

const PLAN_ICONS: Record<PlanId, typeof Globe> = {
  sites: Globe,
  flow: Zap,
  growth: Megaphone,
  os: Globe,
}

const DETAIL: Record<string, { desc: string; bullets: string[] }> = {
  sites: {
    desc: "We design, build, host, and continuously optimise your business website. Conversion-focused copy, on-page SEO, monthly improvements — all included. No agency markup, no project manager ping-pong.",
    bullets: [
      "Custom design in your brand colours",
      "Mobile-first, sub-2s load time",
      "Monthly copy and SEO updates",
      "Global CDN — 99.9% uptime",
      "Contact forms, live chat, lead capture",
    ],
  },
  flow: {
    desc: "We map the work your team currently does by hand and rebuild it to happen on its own. Customer records, invoices, order routing, approvals, status emails — if a person does it on repeat, it can run without them.",
    bullets: [
      "Discovery workshop to map your processes",
      "Connects the tools you already use",
      "Invoices, follow-ups and handoffs run themselves",
      "Error alerting + monthly health report",
      "Unlimited workflow runs",
    ],
  },
  growth: {
    desc: "We build and operate the systems that attract prospects, capture demand, nurture leads, and turn more opportunities into customers. You approve what goes out.",
    bullets: [
      "Content, social and SEO copy written in your brand voice — LinkedIn, Instagram, X, blog and email",
      "Leads scored, qualified and routed automatically (Lead Intelligence)",
      "Email newsletters and automated follow-up sequences",
      "Every contact tracked from first touch to won",
      "Campaign and funnel performance reported monthly, with A/B and subject-line testing",
      "You approve before anything sends",
    ],
  },
  os: {
    desc: "Every SYNTRA service unified in one dashboard, plus a dedicated implementation team that handles onboarding, integrations, and ongoing optimisation. The closest thing to a full tech team without hiring one.",
    bullets: [
      "Sites, Flow and Growth combined",
      "Dedicated implementation manager",
      "Weekly strategy calls",
      "Priority support (2-hour SLA)",
      "Custom integrations on request",
    ],
  },
}

const CORE = PLANS.filter((p) => p.id !== "os")
const OS = getPlan("os")!

const PROCESS = [
  { step: "01", title: "Free audit", body: "We review your current tools, workflows, and goals in a 15-minute call. No pitch — just diagnosis." },
  { step: "02", title: "Proposal", body: "You receive a scoped plan: exactly what we'll build, how long it takes, and what it costs." },
  { step: "03", title: "Build sprint", body: "We implement in 2–4 weeks. You review progress at each milestone before we proceed." },
  { step: "04", title: "Launch + handover", body: "Go live. We train your team, document everything, and stay on for 30 days to handle any edge cases." },
  { step: "05", title: "Ongoing management", body: "Monthly check-ins, updates, and optimisations included in your subscription. We run it so you don't have to." },
]

function price(kesAmount: number, usd: number) {
  return { kes: `KES ${kesAmount.toLocaleString()} / mo`, usd: `$${usd} / mo` }
}

export default function ServicesPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-border-subtle px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-[11px] uppercase tracking-widest text-text-disabled">
            Services
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Three services.
            <br />
            <span className="text-cyan-500">One operating system.</span>
          </h1>
          <p className="text-base text-text-muted">
            Each service takes one area of repetitive work off your plate. Or take all three.
          </p>
        </div>
      </section>

      {/* Core services */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-3">
            {CORE.map((s) => {
              const d = DETAIL[s.id]!
              const p = price(s.priceKes, s.priceUsd)
              const Icon = PLAN_ICONS[s.id]
              return (
                <div
                  key={s.id}
                  className="flex flex-col rounded-xl border border-border-subtle bg-bg-elevated p-7"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                      <Icon className="h-5 w-5 text-cyan-500" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-disabled">
                      {s.category}
                    </span>
                  </div>

                  <h2 className="text-lg font-bold text-text-primary">{s.name}</h2>

                  <div className="mt-4 border-y border-border-subtle py-3">
                    <div className="text-sm font-semibold text-text-primary">{p.kes}</div>
                    <div className="text-xs text-text-disabled">{p.usd}</div>
                  </div>

                  <p className="mt-4 text-sm leading-relaxed text-text-muted">{d.desc}</p>

                  <ul className="mt-5 grid flex-1 gap-2">
                    {d.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-2 text-xs text-text-muted">
                        <span className="mt-0.5 shrink-0 text-cyan-500">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Capabilities — in every plan, never sold alone */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            In every plan
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">
            What every service is built on
          </h2>
          <div className="grid gap-5 md:grid-cols-2">
            {CAPABILITIES.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border-subtle bg-bg-elevated p-7"
              >
                <h3 className="text-base font-bold text-text-primary">{c.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{c.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Syntra OS */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-xl border border-cyan-500/50 bg-cyan-500/5 p-8">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <span className="mb-2 inline-block rounded-full bg-cyan-500 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bg-base">
                  {OS.badge}
                </span>
                <h2 className="text-xl font-bold text-text-primary">{OS.name}</h2>
                <p className="max-w-md text-sm text-text-muted">{OS.summary}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-text-primary">
                  KES {OS.priceKes.toLocaleString()} / mo
                </div>
                <div className="text-xs text-text-disabled">${OS.priceUsd} / mo</div>
                <div className="mt-1 text-[11px] text-cyan-400">
                  Saves ${CORE.reduce((n, s) => n + s.priceUsd, 0) - OS.priceUsd}/mo vs. separately
                </div>
              </div>
            </div>

            <p className="mb-5 text-sm leading-relaxed text-text-muted">{DETAIL["os"]!.desc}</p>

            <ul className="grid gap-2 sm:grid-cols-2">
              {DETAIL["os"]!.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-xs text-text-muted">
                  <span className="mt-0.5 shrink-0 text-cyan-500">✓</span>
                  {b}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pricing"
                className="flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
              >
                Get started →
              </Link>
              <Link
                href="/contact"
                className="flex h-9 items-center rounded-md border border-border-subtle px-5 text-sm text-text-muted hover:text-text-primary transition-colors"
              >
                Talk to us first
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            How it works
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">
            From audit to automation in weeks
          </h2>
          <div className="relative grid gap-0">
            {PROCESS.map((p, i) => (
              <div key={p.step} className="flex gap-6 py-5">
                <div className="flex flex-col items-center">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-cyan-500/40 bg-cyan-500/10 text-xs font-bold text-cyan-500">
                    {p.step}
                  </div>
                  {i < PROCESS.length - 1 && (
                    <div className="mt-1 h-full w-px bg-border-subtle" />
                  )}
                </div>
                <div className="pb-4">
                  <h3 className="mb-1 font-semibold text-text-primary">{p.title}</h3>
                  <p className="text-sm text-text-muted">{p.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-2xl font-bold text-text-primary">Not sure where to start?</h2>
          <p className="mb-8 text-sm text-text-muted">
            Take the free audit. We&apos;ll look at your current setup and tell you exactly which
            service will have the biggest impact for your business.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/audit"
              className="flex h-10 items-center rounded-md bg-cyan-500 px-6 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
            >
              Get free audit →
            </Link>
            <Link
              href="/pricing"
              className="flex h-10 items-center rounded-md border border-border-subtle px-6 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              See pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
