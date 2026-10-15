import Link from "next/link"
import {
  Globe,
  Zap,
  Activity,
  LifeBuoy,
  FileText,
  CreditCard,
  ArrowRight,
  type LucideIcon,
} from "lucide-react"

import type { ClientServiceKey } from "@syntra/db"

interface Props {
  fullName: string
  activeServices: Set<ClientServiceKey>
}

interface Card {
  key: ClientServiceKey
  label: string
  description: string
  href: string
  icon: LucideIcon
}

const ALL_CARDS: Card[] = [
  {
    key: "website",
    label: "Websites",
    description: "View status and request changes",
    href: "/portal/websites",
    icon: Globe,
  },
  {
    key: "automations",
    label: "Automations",
    description: "The workflows running your operations",
    href: "/portal/automations",
    icon: Zap,
  },
  {
    key: "monitoring",
    label: "Monitoring",
    description: "Uptime and recent activity",
    href: "/portal/monitoring",
    icon: Activity,
  },
  {
    key: "support",
    label: "Support",
    description: "Open a request or track an existing one",
    href: "/portal/support",
    icon: LifeBuoy,
  },
  {
    key: "reports",
    label: "Reports",
    description: "Monthly summaries of what shipped and ran",
    href: "/portal/reports",
    icon: FileText,
  },
  {
    key: "billing",
    label: "Billing",
    description: "Invoices and your maintenance subscription",
    href: "/portal/billing",
    icon: CreditCard,
  },
]

function firstName(fullName: string): string {
  return fullName.split(" ")[0] ?? fullName
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function SuiteHome({ fullName, activeServices }: Props) {
  const cards = ALL_CARDS.filter((c) => activeServices.has(c.key))

  return (
    <div className="p-8">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
          {getGreeting()}
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-text-primary">
          Welcome, {firstName(fullName)}.
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Everything we&apos;re building and running for you, in one place.
        </p>
      </div>

      {cards.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-8 text-center">
          <p className="text-sm text-text-muted">
            Your services haven&apos;t been activated yet.
          </p>
          <p className="mt-1 text-xs text-text-disabled">
            We&apos;ll flip them on as each piece of work gets underway — nothing to do on your side.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => {
            const Icon = c.icon
            return (
              <Link
                key={c.key}
                href={c.href}
                className="group rounded-xl border border-border-subtle bg-bg-elevated p-5 transition hover:border-cyan-500/30 hover:bg-bg-overlay/40"
              >
                <div className="flex items-start justify-between">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Icon className="h-5 w-5" />
                  </span>
                  <ArrowRight className="h-4 w-4 text-text-disabled transition group-hover:translate-x-0.5 group-hover:text-cyan-400" />
                </div>
                <div className="mt-4">
                  <p className="text-sm font-semibold text-text-primary">{c.label}</p>
                  <p className="mt-1 text-xs text-text-muted">{c.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
