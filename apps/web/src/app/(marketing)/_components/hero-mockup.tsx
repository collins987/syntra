import {
  BarChart3,
  Check,
  Globe,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react"

// A product illustration of the portal, built in markup rather than shipped as
// a screenshot: it stays sharp at any width, re-themes with the design tokens,
// and does not go stale when the real UI moves on.
//
// The whole thing is aria-hidden: the figures below are illustrative sample
// data for an invented company, and nothing here should be read out as if it
// were a real account or announced to a screen reader as content.

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Website", icon: Globe, active: false },
  { label: "Marketing", icon: Megaphone, active: false },
  { label: "Automations", icon: Zap, active: false },
  { label: "Leads", icon: Users, active: false },
  { label: "Analytics", icon: BarChart3, active: false },
  { label: "Settings", icon: Settings, active: false },
]

const TILES = [
  { label: "Total Leads", value: "142", delta: "+12%" },
  { label: "Automations", value: "24", delta: "+8%" },
  { label: "Revenue", value: "$12,480", delta: "+20%" },
]

const AGENTS = [
  { name: "Ava", role: "Content & Marketing" },
  { name: "Max", role: "Operations & Workflows" },
  { name: "Leo", role: "Analytics & Insights" },
]

const RUNNING = ["Added to CRM", "Sent welcome email", "Notified sales team", "Follow-up scheduled"]

export function HeroMockup() {
  return (
    <div aria-hidden="true" className="pointer-events-none relative select-none">
      <div className="overflow-hidden rounded-xl border border-border bg-bg-surface shadow-modal">
        {/* Top bar */}
        <div className="flex items-center gap-3 border-b border-border-subtle px-3 py-2.5">
          <span className="text-[11px] font-semibold tracking-[0.2em] text-text-primary">
            SYNTRA
          </span>
          <span className="flex h-6 flex-1 items-center gap-1.5 rounded-md border border-border-subtle bg-bg-base px-2">
            <Search className="h-2.5 w-2.5 text-text-disabled" />
          </span>
          <span className="h-5 w-5 rounded-full border border-border-subtle bg-bg-elevated" />
        </div>

        <div className="flex">
          {/* Sidebar */}
          <div className="hidden w-[108px] shrink-0 border-r border-border-subtle py-2.5 sm:block">
            {NAV.map((item) => (
              <div
                key={item.label}
                className={`mx-1.5 mb-0.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[9px] ${
                  item.active
                    ? "bg-cyan-500/10 text-cyan-400"
                    : "text-text-muted"
                }`}
              >
                <item.icon className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Main */}
          <div className="min-w-0 flex-1 p-3">
            <p className="text-[11px] font-semibold text-text-primary">Good morning, Acme Ltd.</p>
            <p className="mt-0.5 text-[9px] text-text-muted">
              Here&apos;s what&apos;s happening with your business today.
            </p>

            <div className="mt-2.5 grid grid-cols-3 gap-1.5">
              {TILES.map((t) => (
                <div
                  key={t.label}
                  className="rounded-md border border-border-subtle bg-bg-elevated px-2 py-1.5"
                >
                  <p className="truncate text-[8px] text-text-muted">{t.label}</p>
                  <p className="mt-0.5 font-mono text-[11px] font-semibold tabular-nums text-text-primary">
                    {t.value}
                  </p>
                  <p className="text-[8px] font-medium text-success-400">{t.delta}</p>
                </div>
              ))}
            </div>

            <div className="mt-1.5 grid gap-1.5 sm:grid-cols-[1.45fr_1fr]">
              {/* Growth chart */}
              <div className="rounded-md border border-border-subtle bg-bg-elevated p-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-[9px] font-medium text-text-primary">Business Growth</p>
                  <p className="text-[8px] font-medium text-cyan-400">+32%</p>
                </div>
                <p className="text-[8px] text-text-disabled">Last 30 days</p>
                <svg viewBox="0 0 200 56" className="mt-1.5 h-12 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="hero-spark" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0,46 L28,41 L56,43 L84,31 L112,27 L140,17 L168,21 L200,7 L200,56 L0,56 Z"
                    fill="url(#hero-spark)"
                    className="animate-fade-in"
                  />
                  <polyline
                    points="0,46 28,41 56,43 84,31 112,27 140,17 168,21 200,7"
                    fill="none"
                    stroke="#00E5FF"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeDasharray="260"
                    className="animate-draw motion-reduce:animate-none"
                  />
                  {/* Live end-point: the number is still moving */}
                  <circle cx="200" cy="7" r="2.5" fill="#00E5FF" className="animate-pulse-slow motion-reduce:animate-none" />
                </svg>
              </div>

              {/* Agents */}
              <div className="rounded-md border border-border-subtle bg-bg-elevated p-2">
                <p className="text-[9px] font-medium text-text-primary">AI Agents</p>
                <div className="mt-1.5 space-y-1.5">
                  {AGENTS.map((a) => (
                    <div key={a.name} className="flex items-center gap-1.5">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10 text-[7px] font-bold text-cyan-400">
                        {a.name[0]}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[8px] font-medium leading-tight text-text-primary">
                          {a.name}
                        </span>
                        <span className="block truncate text-[7px] leading-tight text-text-disabled">
                          {a.role}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-1">
                        <span className="h-1 w-1 animate-pulse-slow rounded-full bg-success-400 motion-reduce:animate-none" />
                        <span className="text-[7px] text-success-400">Online</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone — the same lead, seen from the other side of the system */}
      <div className="absolute -bottom-7 -left-5 hidden w-[132px] animate-drift rounded-xl border border-border bg-bg-surface p-2 shadow-modal motion-reduce:animate-none lg:block">
        <span className="mx-auto mb-2 block h-0.5 w-8 rounded-full bg-border" />
        <div className="rounded-md border border-success-500/25 bg-success-500/10 px-1.5 py-1">
          <p className="flex items-center gap-1 text-[8px] font-medium text-success-400">
            <Check className="h-2 w-2 shrink-0" />
            New lead captured
          </p>
        </div>
        <p className="mt-1.5 inline-block rounded border border-cyan-500/25 bg-cyan-500/10 px-1.5 py-0.5 font-mono text-[8px] text-cyan-400">
          Score 87 (A)
        </p>
        <p className="mt-2 text-[8px] text-text-muted">Automations running…</p>
        {/* Each step appears as it completes, so the automation reads as
            running rather than as a finished list. */}
        <div className="mt-1 space-y-1">
          {RUNNING.map((step, i) => (
            <p
              key={step}
              style={{ animationDelay: `${600 + i * 450}ms` }}
              className="flex animate-rise items-center gap-1 text-[8px] text-text-secondary motion-reduce:animate-none"
            >
              <Check className="h-2 w-2 shrink-0 text-success-400" />
              <span className="truncate">{step}</span>
            </p>
          ))}
        </div>
      </div>
    </div>
  )
}
