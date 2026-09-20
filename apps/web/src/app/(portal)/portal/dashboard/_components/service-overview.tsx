import Link from "next/link"
import { Globe, Zap, Megaphone, Users, Bot, Layers } from "lucide-react"
import type { ServiceOverview as ServiceOverviewData } from "@/lib/dashboard"
import { ServiceCard, type ServiceCardData } from "@/components/portal/service-card"

function buildRows(s: ServiceOverviewData): ServiceCardData[] {
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
          <ServiceCard key={row.href} service={row} />
        ))}
      </div>
    </div>
  )
}
