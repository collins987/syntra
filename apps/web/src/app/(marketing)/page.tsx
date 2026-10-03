import type { Metadata } from "next"
import Link from "next/link"
import {
  Globe,
  Zap,
  Megaphone,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileSearch,
  CreditCard,
  UserCheck,
} from "lucide-react"
import { PLANS, CAPABILITIES, getPlan, type PlanId } from "@/lib/pricing"
import { MarketingShell } from "@/components/marketing/shell"
import { AnimatedHeadline } from "./_components/animated-headline"
import { HeroMockup } from "./_components/hero-mockup"

export const metadata: Metadata = {
  title: "SYNTRA | Build. Automate. Scale.",
  description:
    "SYNTRA runs the repetitive parts of your business. We build and manage your website, marketing and daily operations so your team can focus on growth.",
}

const CORE = PLANS.filter((p) => p.id !== "os")
const OS = getPlan("os")!

// Same icon means the same thing here as it does in the portal sidebar.
const PLAN_ICONS: Record<PlanId, typeof Globe> = {
  sites: Globe,
  flow: Zap,
  growth: Megaphone,
  os: Globe,
}

// What we commit to — not traction claims. With no customers yet, "500+
// businesses" or an uptime percentage would be invented, and a first client
// checks exactly that kind of number.
const COMMITMENTS = [
  { value: "48 hrs", label: "Average time to launch", icon: Zap },
  { value: "24/7", label: "Your systems keep running", icon: ShieldCheck },
  { value: "Monthly", label: "Continuous improvements", icon: TrendingUp },
]

const STEPS = [
  { title: "Free Audit", body: "Tell us about your business and goals.", icon: FileSearch },
  { title: "Choose Plan", body: "Pick the service that fits what hurts most.", icon: CreditCard },
  { title: "Onboarding", body: "We set up your account and connect your tools.", icon: UserCheck },
  { title: "Automation Live", body: "Your systems start working for you — 24/7.", icon: Zap },
  { title: "Grow Faster", body: "Track progress, get insights and scale.", icon: TrendingUp },
]

// Claims about how the product is built, which are checkable in the product —
// not claims about traction, which would not be. Said plainly: a business
// owner should not need to know what AES-256 is to understand the promise.
const GUARANTEES = [
  { value: "Security", label: "Your passwords stay protected, always" },
  { value: "You decide", label: "Nothing important happens without your approval" },
  { value: "Full history", label: "See everything the system did, any time" },
]

export default function HomePage() {
  return (
    <MarketingShell>
      {/* Hero */}
      {/* On a desktop screen the hero fills the viewport below the 4rem nav
          and the commitments sit at the bottom of it, so all three are visible
          on load rather than a scroll away. min-height, not height: on a short
          window the content still grows and scrolls instead of overlapping.

          The page's lighting lives in SiteBackground. The hero adds one local
          glow so the interface preview stays the brightest point on the page. */}
      <section className="relative z-10 flex flex-col px-6 pb-10 pt-12 md:pt-14 lg:min-h-[calc(100vh-4rem)]">
        <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center rounded-full border border-cyan-500/20 bg-cyan-500/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
              The AI automation platform
            </span>

            <AnimatedHeadline className="mt-5 text-5xl font-bold leading-[1.04] tracking-tight text-text-primary md:text-6xl" />

            <p className="mt-5 max-w-md text-lg leading-relaxed text-text-secondary">
              SYNTRA runs your website, marketing and daily operations using AI and automation — so
              you can focus on what really matters: growth.
            </p>

            <div className="mt-7 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/audit"
                className="flex h-11 items-center justify-center rounded-lg bg-cyan-500 px-8 text-base font-semibold text-bg-base shadow-glow transition-colors hover:bg-cyan-400"
              >
                Get your free audit →
              </Link>
              <Link
                href="/services"
                className="flex h-11 items-center justify-center rounded-lg border border-border px-8 text-base text-text-secondary transition-colors hover:border-border-strong hover:text-text-primary"
              >
                See what we handle
              </Link>
            </div>
          </div>

          {/* Product illustration — decorative, see the component */}
          <div className="relative isolate lg:pl-4">
            {/* Contained glow so the panel reads as lit from within, rather
                than sitting flat on the page. `isolate` keeps the negative
                z-index inside this wrapper. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -inset-16 -z-10 animate-glow-pulse bg-[radial-gradient(closest-side,rgba(0,229,255,0.13)_0%,rgba(0,229,255,0.06)_45%,rgba(0,229,255,0.015)_72%,rgba(0,229,255,0)_100%)] motion-reduce:animate-none"
            />
            <HeroMockup />
          </div>
        </div>

        {/* Commitments */}
        <div className="mx-auto mt-10 grid w-full max-w-6xl shrink-0 gap-6 border-t border-border-subtle pt-7 sm:grid-cols-3 sm:gap-0">
          {COMMITMENTS.map((c, i) => (
            <div
              key={c.label}
              className={`flex items-center gap-3 sm:px-6 ${
                i > 0 ? "sm:border-l sm:border-border-subtle" : ""
              } ${i === 0 ? "sm:pl-0" : ""}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <c.icon className="h-4 w-4 text-cyan-400" />
              </span>
              <span>
                <span className="block text-base font-semibold text-text-primary">{c.value}</span>
                <span className="block text-sm text-text-muted">{c.label}</span>
              </span>
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
            {CORE.map((s) => {
              const Icon = PLAN_ICONS[s.id]
              return (
                <Link
                  key={s.id}
                  href="/services"
                  className="group relative flex flex-col overflow-hidden rounded-lg border border-border-subtle bg-bg-surface p-6 transition-all duration-200 hover:border-cyan-500/40 hover:shadow-glow"
                >
                  {/* Accent rail — lights up on hover so the card reads as clickable */}
                  <span className="absolute inset-x-0 top-0 h-px bg-cyan-500/0 transition-colors duration-200 group-hover:bg-cyan-500/50" />

                  <div className="mb-5 flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/5 transition-colors duration-200 group-hover:border-cyan-500/40 group-hover:bg-cyan-500/10">
                      <Icon className="h-5 w-5 text-cyan-400" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-disabled">
                      {s.category}
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold text-text-primary">{s.name}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-text-muted">{s.summary}</p>

                  <div className="mt-6 flex items-baseline gap-2 border-t border-border-subtle pt-4">
                    <span className="text-lg font-semibold tabular-nums text-text-primary">
                      ${s.priceUsd}
                      <span className="text-xs font-normal text-text-disabled">/mo</span>
                    </span>
                    <span className="text-xs tabular-nums text-text-disabled">
                      KES {s.priceKes.toLocaleString()}
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 self-center text-text-disabled transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                  </div>
                </Link>
              )
            })}
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

      {/* How it works */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-text-disabled">
            How it works
          </p>
          <h2 className="text-center text-3xl font-bold text-text-primary">
            From signup to results — in days, not months.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-center text-text-muted">
            We handle the technical complexity. You get the results.
          </p>

          <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative text-center">
                {/* Connector — desktop only, never after the last step */}
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="absolute left-[calc(50%+2.25rem)] right-[calc(-50%+2.25rem)] top-7 hidden h-px bg-border-subtle lg:block"
                  >
                    {/* A pulse travelling down the line: the pipeline is moving */}
                    <span
                      className="absolute inset-0 animate-trace bg-[linear-gradient(90deg,rgba(0,229,255,0)_0%,rgba(0,229,255,0.9)_50%,rgba(0,229,255,0)_100%)] bg-[length:60%_100%] bg-no-repeat motion-reduce:animate-none"
                      style={{ animationDelay: `${i * 700}ms` }}
                    />
                  </span>
                )}
                <span className="group relative mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/5 transition-colors duration-200 hover:border-cyan-500/50 hover:bg-cyan-500/10">
                  <s.icon className="h-5 w-5 text-cyan-400" />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-text-primary">
                  {i + 1}. {s.title}
                </h3>
                <p className="mx-auto mt-1.5 max-w-[15rem] text-sm leading-relaxed text-text-muted">
                  {s.body}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* How we're built + closing CTA */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-cyan-400">
              How we&apos;re built
            </p>
            <h2 className="text-3xl font-bold text-text-primary">
              Built in Kenya. Built for global scale.
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-text-muted">
              Automation only helps if you can trust it. Your credentials stay encrypted on our
              side, anything irreversible waits for your approval, and everything the system does
              is written down.
            </p>
            <Link
              href="/audit"
              className="mt-8 inline-flex h-11 items-center rounded-lg bg-cyan-500 px-8 text-base font-semibold text-bg-base shadow-glow transition-colors hover:bg-cyan-400"
            >
              Get your free audit →
            </Link>
          </div>

          <dl className="grid gap-8 sm:grid-cols-3 sm:gap-6">
            {GUARANTEES.map((g) => (
              <div key={g.value} className="sm:text-center">
                <dt className="text-xl font-bold text-text-primary">{g.value}</dt>
                <dd className="mt-1.5 text-sm leading-relaxed text-text-muted">{g.label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

    </MarketingShell>
  )
}
