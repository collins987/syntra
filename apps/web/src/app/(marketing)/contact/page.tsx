import Link from "next/link"
import { MarketingShell } from "@/components/marketing/shell"

const CHANNELS = [
  {
    icon: "✉",
    label: "General enquiries",
    value: "hello@syntraco.tech",
    href: "mailto:hello@syntraco.tech",
    desc: "Sales, partnerships, pricing questions",
  },
  {
    icon: "⚙",
    label: "Client support",
    value: "support@syntraco.tech",
    href: "mailto:support@syntraco.tech",
    desc: "Existing clients — bugs, access, billing",
  },
]

const FAQS = [
  {
    q: "How quickly can you start?",
    a: "We typically kick off within 5 business days of a signed proposal. For Syntra Sites, the first draft goes live in 2 weeks.",
  },
  {
    q: "Do I need to provide content or copy?",
    a: "No. We interview you for 60 minutes and write everything from scratch using AI trained on your brand voice.",
  },
  {
    q: "Can I pay via M-Pesa?",
    a: "Yes. All plans support M-Pesa STK Push through IntaSend — you pay in KES directly from your phone.",
  },
  {
    q: "Is there a contract or minimum term?",
    a: "No contracts, no lock-in. Monthly subscriptions. Cancel any time from your billing portal.",
  },
  {
    q: "What if I already have a website or tools?",
    a: "We audit what you have and migrate or integrate where possible. You won't lose existing data or rankings.",
  },
  {
    q: "Where is your team based?",
    a: "Nairobi, Kenya. We work with clients across East Africa and remotely worldwide.",
  },
]

export default function ContactPage() {
  return (
    <MarketingShell>
      {/* Hero */}
      <section className="border-b border-border-subtle px-6 py-20 text-center">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-elevated px-3 py-1 text-[11px] uppercase tracking-widest text-text-disabled">
            Contact
          </div>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-text-primary md:text-5xl">
            Get in touch
          </h1>
          <p className="text-base text-text-muted">
            Have a question, a project, or just want to see if SYNTRA is the right fit?
            We respond to every message within one business day.
          </p>
        </div>
      </section>

      {/* Contact channels + CTA */}
      <section className="border-b border-border-subtle px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-2 md:items-start">
            {/* Email channels */}
            <div>
              <h2 className="mb-6 text-lg font-bold text-text-primary">Email us directly</h2>
              <div className="space-y-4">
                {CHANNELS.map((c) => (
                  <a
                    key={c.href}
                    href={c.href}
                    className="group flex items-start gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-5 transition-colors hover:border-cyan-500/40"
                  >
                    <span className="mt-0.5 text-xl text-cyan-500">{c.icon}</span>
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-disabled">
                        {c.label}
                      </div>
                      <div className="mt-0.5 font-medium text-text-primary group-hover:text-cyan-500 transition-colors">
                        {c.value}
                      </div>
                      <div className="mt-1 text-xs text-text-muted">{c.desc}</div>
                    </div>
                  </a>
                ))}
              </div>

              <div className="mt-6 rounded-xl border border-border-subtle bg-bg-elevated p-5">
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-disabled">
                  Office location
                </div>
                <div className="text-sm text-text-muted">Nairobi, Kenya</div>
                <div className="mt-1 text-xs text-text-disabled">Remote-first — we work with clients worldwide</div>
              </div>
            </div>

            {/* CTA card */}
            <div>
              <h2 className="mb-6 text-lg font-bold text-text-primary">Fastest path to an answer</h2>
              <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-6">
                <div className="mb-3 text-2xl">🎯</div>
                <h3 className="mb-2 font-bold text-text-primary">Start with the free audit</h3>
                <p className="mb-5 text-sm text-text-muted">
                  Our audit form takes 3 minutes. You get a personalised score, a breakdown of
                  your top automation opportunities, and our team follows up within 24 hours.
                  No sales call required upfront.
                </p>
                <Link
                  href="/audit"
                  className="inline-flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
                >
                  Take the free audit →
                </Link>
              </div>

              <div className="mt-4 rounded-xl border border-border-subtle bg-bg-elevated p-6">
                <div className="mb-3 text-2xl">💳</div>
                <h3 className="mb-2 font-bold text-text-primary">Ready to get started?</h3>
                <p className="mb-5 text-sm text-text-muted">
                  Browse our plans, pick a tier, and pay via Stripe (card) or M-Pesa.
                  Onboarding kicks off the next business day.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex h-9 items-center rounded-md border border-border-subtle px-5 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            Common questions
          </p>
          <h2 className="mb-10 text-center text-2xl font-bold text-text-primary">FAQ</h2>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <div key={faq.q} className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
                <h3 className="mb-2 font-semibold text-text-primary">{faq.q}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
