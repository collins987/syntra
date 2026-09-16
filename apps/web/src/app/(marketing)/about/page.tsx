import Link from "next/link"
import { MarketingShell } from "@/components/marketing/shell"
import { PLANS } from "@/lib/pricing"

const PRODUCTS = PLANS.map((p, i) => ({
  name: p.name,
  tag: String(i + 1).padStart(2, "0"),
  desc: p.summary,
}))

const VALUES = [
  {
    title: "Outcome first",
    body: "We measure success by the hours you save and the revenue you gain, not by features shipped or dashboards built.",
  },
  {
    title: "Local context",
    body: "We're based in Nairobi. We understand Kenyan and African business realities — mobile-first, cost-sensitive, relationship-driven.",
  },
  {
    title: "Radical transparency",
    body: "No lock-in contracts, no surprise bills. You see exactly what's running, what it costs, and what it's producing.",
  },
  {
    title: "Built to scale",
    body: "Whether you're 2 people or 200, the platform grows with you. Start with one product, unlock the OS when you're ready.",
  },
]

export default function AboutPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-border-subtle px-6 py-20 text-center">
        <div className="mx-auto max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-[11px] uppercase tracking-widest text-text-disabled">
            About SYNTRA
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Built in Nairobi.
            <br />
            <span className="text-cyan-500">Built for modern business.</span>
          </h1>
          <p className="text-base text-text-muted">
            SYNTRA is an AI automation company helping businesses in Kenya and beyond replace
            slow manual processes with intelligent, always-on systems.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
                Our story
              </p>
              <h2 className="mb-5 text-2xl font-bold text-text-primary">
                Why we started SYNTRA
              </h2>
              <p className="mb-4 text-sm leading-relaxed text-text-muted">
                Most small and medium businesses across Africa run on spreadsheets, WhatsApp threads,
                and manual follow-ups. The tools that exist were built for Fortune 500 companies in
                San Francisco — overpriced, over-engineered, and disconnected from local reality.
              </p>
              <p className="text-sm leading-relaxed text-text-muted">
                SYNTRA was founded to close that gap. We combine world-class AI infrastructure with
                hands-on implementation support, so you get results in weeks, not months — without
                needing a technical team.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { stat: "6", label: "Products in the suite" },
                { stat: "KES", label: "M-Pesa payments supported" },
                { stat: "24/7", label: "Automations run non-stop" },
                { stat: "NBO", label: "Headquartered in Nairobi" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
                  <div className="text-2xl font-bold text-cyan-500">{item.stat}</div>
                  <div className="mt-1 text-xs text-text-muted">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            How we operate
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">Our values</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {VALUES.map((v) => (
              <div key={v.title} className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
                <h3 className="mb-2 font-semibold text-text-primary">{v.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products overview */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            The suite
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">What SYNTRA builds for you</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PRODUCTS.map((p) => (
              <div key={p.name} className="group rounded-xl border border-border-subtle bg-bg-elevated p-5 transition-colors hover:border-cyan-500/40">
                <div className="mb-2 text-[11px] font-bold tabular-nums text-cyan-500/60">{p.tag}</div>
                <h3 className="mb-2 font-semibold text-text-primary">{p.name}</h3>
                <p className="text-xs leading-relaxed text-text-muted">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="mb-4 text-2xl font-bold text-text-primary">Ready to automate?</h2>
          <p className="mb-8 text-sm text-text-muted">
            Start with a free 15-minute audit. We&apos;ll show you exactly which parts of your
            business can be automated this month.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/audit"
              className="flex h-10 items-center rounded-md bg-cyan-500 px-6 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
            >
              Get your free audit →
            </Link>
            <Link
              href="/pricing"
              className="flex h-10 items-center rounded-md border border-border-subtle px-6 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
