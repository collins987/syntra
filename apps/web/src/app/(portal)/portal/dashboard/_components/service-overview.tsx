import Link from "next/link"
import { Globe, Zap, Megaphone, Users, Bot, Layers, ChevronRight } from "lucide-react"
import type { ServiceOverview as ServiceOverviewData } from "@/lib/dashboard"

interface Row {
  href: string
  icon: React.ElementType
  name: string
  sub: string
  live: boolean
  metric: string
}

function buildRows(s: ServiceOverviewData): Row[] {
  return [
    {
      href: "/portal/websites",
      icon: Globe,
      name: "Syntra Sites",
      sub: "Website & SEO",
      live: s.sites.live > 0,
      metric:
        s.sites.total === 0
          ? "Not started"
          : `${s.sites.live} of ${s.sites.total} live`,
    },
    {
      href: "/portal/automations",
      icon: Zap,
      name: "Syntra Flow",
      sub: "Automation & workflows",
      live: s.flow.active > 0,
      metric:
        s.flow.total === 0
          ? "Not started"
          : `${s.flow.active} active${
              s.flow.successRate === null ? "" : ` · ${s.flow.successRate.toFixed(0)}%`
            }`,
    },
    {
      href: "/portal/marketing",
      icon: Megaphone,
      name: "Syntra Marketing",
      sub: "Content & campaigns",
      live: s.marketing.connected,
      metric: "Not connected",
    },
    {
      href: "/portal/leads",
      icon: Users,
      name: "Lead Intelligence",
      sub: "Scoring & CRM",
      live: s.leadIntelligence.total > 0,
      metric: s.leadIntelligence.total === 0 ? "No leads yet" : `${s.leadIntelligence.total} leads`,
    },
    {
      href: "/portal/ai-agents",
      icon: Bot,
      name: "AI Agents",
      sub: "Ava · Max · Leo",
      live: s.aiAgents.activeTasks > 0,
      metric:
        s.aiAgents.activeTasks === 0
          ? "Idle"
          : `${s.aiAgents.activeTasks} task${s.aiAgents.activeTasks === 1 ? "" : "s"}`,
    },
    {
      href: "/portal/billing",
      icon: Layers,
      name: "Syntra OS",
      sub: "All services in one",
      live: s.os.active,
      metric: s.os.active ? "Active" : "Not upgraded",
    },
  ]
}

export function ServiceOverview({ services }: { services: ServiceOverviewData }) {
  const rows = buildRows(services)

  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Service Overview
        </span>
        <Link
          href="/portal/settings"
          className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted"
        >
          Manage
        </Link>
      </div>

      <div className="divide-y divide-border-subtle/60">
        {rows.map((row) => (
          <Link
            key={row.href}
            href={row.href}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-elevated/60"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08]">
              <row.icon className="h-3.5 w-3.5 text-cyan-400" />
            </span>

            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12.5px] font-medium text-text-primary">
                {row.name}
              </span>
              <span className="block truncate text-[10.5px] text-text-disabled">{row.sub}</span>
            </span>

            <span className="flex shrink-0 flex-col items-end gap-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
                  row.live
                    ? "border-success-500/25 bg-success-500/10 text-success-400"
                    : "border-border-subtle bg-bg-elevated text-text-disabled"
                }`}
              >
                <span className={`h-1 w-1 rounded-full ${row.live ? "bg-success-400" : "bg-text-disabled"}`} />
                {row.live ? "Live" : "Off"}
              </span>
              <span className="whitespace-nowrap text-[10px] text-text-muted">{row.metric}</span>
            </span>

            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-disabled" />
          </Link>
        ))}
      </div>
    </div>
  )
}
