import Link from "next/link"
import { ChevronRight } from "lucide-react"
import type { ElementType } from "react"

export interface ServiceCardData {
  href: string
  icon: ElementType
  name: string
  sub: string
  live: boolean
  metric: string
}

/** One row in a service list — the dashboard's Service Overview panel. */
export function ServiceCard({ service }: { service: ServiceCardData }) {
  return (
    <Link
      href={service.href}
      className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-bg-elevated/60"
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08]">
        <service.icon className="h-3.5 w-3.5 text-cyan-400" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-[12.5px] font-medium text-text-primary">
          {service.name}
        </span>
        <span className="block truncate text-[10.5px] text-text-disabled">{service.sub}</span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1">
        <span
          className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
            service.live
              ? "border-success-500/25 bg-success-500/10 text-success-400"
              : "border-border-subtle bg-bg-elevated text-text-disabled"
          }`}
        >
          <span className={`h-1 w-1 rounded-full ${service.live ? "bg-success-400" : "bg-text-disabled"}`} />
          {service.live ? "Live" : "Off"}
        </span>
        <span className="whitespace-nowrap text-[10px] text-text-muted">{service.metric}</span>
      </span>

      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-disabled" />
    </Link>
  )
}
