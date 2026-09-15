import Link from "next/link"
import { MarketingShell } from "@/components/marketing/shell"

const SERVICES = [
  {
    id: "sites",
    tag: "01",
    name: "Syntra Sites",
    tagline: "Your website, done for you.",
    price: "KES 38,700 / mo",
    priceUsd: "$297 / mo",
    desc: "We design, build, host, and continuously optimise your business website. Conversion-focused copy, on-page SEO, monthly CRO updates — all included. No agency markup, no project manager ping-pong.",
    bullets: [
      "Custom design in your brand colours",
      "Mobile-first, sub-2s load time",
      "Monthly copy and SEO updates",
      "Cloudflare CDN — 99.9% uptime",
      "Contact forms, live chat, lead capture",
    ],
  },
  {
    id: "flow",
    tag: "02",
    name: "Syntra Flow",
    tagline: "Stop doing things manually.",
    price: "KES 64,700 / mo",
    priceUsd: "$497 / mo",
    desc: "We map your current manual workflows and rebuild them as automated pipelines. CRM sync, invoice dispatch, order routing, approval chains, status emails — if a human does it on repeat, a machine can do it better.",
    bullets: [
      "Discovery workshop to map your processes",
      "Automation build in n8n or Zapier",
      "Integration with 300+ tools (Gmail, Slack, Notion, Xero…)",
      "Error alerting + monthly health report",
      "Unlimited workflow runs",
    ],
  },
  {
    id: "marketing",
    tag: "03",
    name: "Syntra Marketing",
    tagline: "Content and campaigns on autopilot.",
    price: "Contact us",
    priceUsd: "Custom",
    desc: "AI-generated content calendars, social scheduling, email sequences, and campaign performance dashboards. We run it, you approve it — or set it to fully autonomous mode.",
    bullets: [
      "AI copywriting trained on your brand voice",
      "Social posts for LinkedIn, Instagram, X",
      "Email newsletter + drip sequences",
      "Monthly performance report",
      "A/B testing on subject lines and CTAs",
    ],
  },
  {
    id: "leads",
    tag: "04",
    name: "Syntra Leads",
    tagline: "Never lose a lead again.",
    price: "Contact us",
    priceUsd: "Custom",
    desc: "Automated lead scoring, follow-up sequences, and CRM enrichment. Every inbound lead is graded, routed to the right rep, and followed up within minutes — 24 hours a day.",
    bullets: [
      "A/B/C/D scoring model out of the box",
      "Auto-enroll in nurture sequence by score tier",
      "CRM sync (HubSpot, Pipedrive, Salesforce)",
      "WhatsApp + email follow-up templates",
      "Pipeline and conversion reporting",
    ],
  },
  {
    id: "ai",
    tag: "05",
    name: "Syntra AI",
    tagline: "Custom AI agents for your business.",
    price: "Contact us",
    priceUsd: "Custom",
    desc: "We build and deploy AI agents trained on your knowledge base — answering customer questions, triaging support tickets, drafting proposals, summarising meeting notes. Works in WhatsApp, your website, email, or Slack.",
    bullets: [
      "Fine-tuned on your docs and FAQs",
      "Deploys to WhatsApp, web, Slack",
      "Escalation logic to human agents",
      "Usage analytics and confidence scoring",
      "Monthly model retraining",
    ],
  },
  {
    id: "os",
    tag: "06",
    name: "Syntra OS",
    tagline: "The full suite, fully managed.",
    price: "KES 129,700 / mo",
    priceUsd: "$997 / mo",
    desc: "Every SYNTRA product unified in one dashboard, plus a dedicated implementation team that handles onboarding, integrations, and ongoing optimisation. The closest thing to having a full tech team without hiring one.",
    bullets: [
      "All 5 products included",
      "Dedicated implementation manager",
      "Weekly strategy calls",
      "Priority support (2-hour SLA)",
      "Custom integrations on request",
    ],
    featured: true,
  },
]

const PROCESS = [
  { step: "01", title: "Free audit", body: "We review your current tools, workflows, and goals in a 15-minute call. No pitch — just diagnosis." },
  { step: "02", title: "Proposal", body: "You receive a scoped plan: exactly what we'll build, how long it takes, and what it costs." },
  { step: "03", title: "Build sprint", body: "We implement in 2–4 weeks. You review progress at each milestone before we proceed." },
  { step: "04", title: "Launch + handover", body: "Go live. We train your team, document everything, and stay on for 30 days to handle any edge cases." },
  { step: "05", title: "Ongoing management", body: "Monthly check-ins, updates, and optimisations included in your subscription. We run it so you don't have to." },
]

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
            Six products.
            <br />
            <span className="text-cyan-500">One operating system.</span>
          </h1>
          <p className="text-base text-text-muted">
            Each SYNTRA product solves a specific bottleneck. Use them individually or combine them
            in Syntra OS for total business automation.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 md:grid-cols-2">
            {SERVICES.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border p-7 ${
                  s.featured
                    ? "border-cyan-500/50 bg-cyan-500/5 md:col-span-2"
                    : "border-border-subtle bg-bg-elevated"
                }`}
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-1 text-[11px] font-bold tabular-nums text-cyan-500/60">{s.tag}</div>
                    <h3 className="text-lg font-bold text-text-primary">{s.name}</h3>
                    <p className="text-sm text-text-muted">{s.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-semibold text-text-primary">{s.price}</div>
                    <div className="text-xs text-text-disabled">{s.priceUsd}</div>
                  </div>
                </div>

                <p className="mb-5 text-sm leading-relaxed text-text-muted">{s.desc}</p>

                <ul className="grid gap-2 sm:grid-cols-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-xs text-text-muted">
                      <span className="mt-0.5 shrink-0 text-cyan-500">✓</span>
                      {b}
                    </li>
                  ))}
                </ul>

                {s.featured && (
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
                )}
              </div>
            ))}
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
            Take the free audit. We'll look at your current setup and tell you exactly which
            product will have the biggest impact for your business.
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
