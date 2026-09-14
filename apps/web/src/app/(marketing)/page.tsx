import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "SYNTRA — Build. Automate. Scale.",
  description:
    "AI-powered websites, workflows, marketing and business automation systems that work while you focus on what matters.",
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-bg-base">
      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(30,41,53,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.25)_1px,transparent_1px)] bg-[size:40px_40px]" />

      {/* Nav */}
      <nav className="relative z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-6 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500">
            <span className="text-xs font-bold text-bg-base">S</span>
          </div>
          <span className="text-sm font-semibold tracking-wide text-text-primary">SYNTRA</span>
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
          <span className="text-xs font-medium text-cyan-400">Autonomous systems running</span>
        </div>

        <h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-text-primary md:text-7xl">
          BUILD THE
          <br />
          <span className="text-cyan-400">AUTONOMOUS</span>
          <br />
          BUSINESS.
        </h1>

        <p className="mt-6 max-w-xl text-lg text-text-secondary">
          AI-powered websites, workflows, marketing and business systems that operate autonomously — so you can focus on growth.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/audit"
            className="flex h-11 items-center rounded-lg bg-cyan-500 px-8 text-base font-semibold text-bg-base shadow-glow hover:bg-cyan-400 transition-colors"
          >
            Build your system →
          </Link>
          <Link
            href="/services"
            className="flex h-11 items-center rounded-lg border border-border px-8 text-base text-text-secondary hover:border-border-strong hover:text-text-primary transition-colors"
          >
            See what we build
          </Link>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-3 gap-12 border-t border-border-subtle pt-12">
          {[
            { value: "42+", label: "Workflows automated" },
            { value: "98.7%", label: "Automation uptime" },
            { value: "3×", label: "Average ROI" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className="text-2xl font-semibold text-text-primary">{stat.value}</p>
              <p className="mt-1 text-sm text-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Products */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-text-disabled">
            Products
          </p>
          <h2 className="mb-12 text-center text-3xl font-bold text-text-primary">
            Everything your business needs to run autonomously
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                name: "Syntra Sites",
                desc: "AI builds, deploys and maintains your website. Input your business — get a production site.",
                tag: "AI Website Builder",
              },
              {
                name: "Syntra Flow",
                desc: "Connect your tools, automate your workflows. No code required.",
                tag: "Workflow Automation",
              },
              {
                name: "Syntra Marketing",
                desc: "Autonomous content, email campaigns and social media — on autopilot.",
                tag: "Marketing Automation",
              },
              {
                name: "Syntra Leads",
                desc: "AI qualifies every lead, scores them, and starts personalised follow-up instantly.",
                tag: "Lead Generation",
              },
              {
                name: "Syntra AI",
                desc: "A system of intelligent agents working on your business 24/7.",
                tag: "AI Agents",
              },
              {
                name: "Syntra OS",
                desc: "The complete business operating system. Custom automation + dedicated support.",
                tag: "Full Platform",
              },
            ].map((product) => (
              <div
                key={product.name}
                className="group rounded-lg border border-border-subtle bg-bg-surface p-5 transition-all duration-200 hover:border-cyan-500/30 hover:shadow-glow"
              >
                <span className="text-[10px] font-semibold uppercase tracking-widest text-cyan-400">
                  {product.tag}
                </span>
                <h3 className="mt-2 text-base font-semibold text-text-primary">{product.name}</h3>
                <p className="mt-1.5 text-sm text-text-muted">{product.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-border-subtle px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-text-primary">
          Ready to build your autonomous system?
        </h2>
        <p className="mt-4 text-text-muted">
          Get a free automation audit — we'll show you exactly what we'd automate in your business.
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
