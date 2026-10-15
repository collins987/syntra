import {
  LayoutDashboard,
  Globe,
  Zap,
  Activity,
  LifeBuoy,
  FileText,
  CreditCard,
  Settings,
} from "lucide-react"
import type { NavGroup } from "@syntra/ui"
import type { ClientServiceKey } from "@syntra/db"

/**
 * Suite nav for personal-account clients. Each entry carries the service key
 * that gates its visibility; the layout filters groups so a client sees only
 * the services they have active. Dashboard and Settings have no key — they
 * are always visible.
 *
 * This is intentionally separate from `packages/ui/layout/navigation.ts`, which
 * is the richer org-based nav still used by existing clients. Collapsing them
 * into one array would mean mixing concerns — org nav has Lead Intelligence,
 * AI Agents and Approvals that have no analogue in a personal-account suite.
 */
export interface SuiteNavItemConfig {
  label: string
  href: string
  icon: NavGroup["items"][number]["icon"]
  sub?: string
  /** Required service key for the row to render. Omit for always-visible rows. */
  service?: ClientServiceKey
}

const SUITE_ITEMS: SuiteNavItemConfig[] = [
  { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
  {
    label: "Websites",
    href: "/portal/websites",
    icon: Globe,
    sub: "Status & change requests",
    service: "website",
  },
  {
    label: "Automations",
    href: "/portal/automations",
    icon: Zap,
    sub: "Workflows at a glance",
    service: "automations",
  },
  {
    label: "Monitoring",
    href: "/portal/monitoring",
    icon: Activity,
    sub: "Uptime & activity",
    service: "monitoring",
  },
  {
    label: "Support",
    href: "/portal/support",
    icon: LifeBuoy,
    sub: "Requests & tickets",
    service: "support",
  },
  { label: "Reports", href: "/portal/reports", icon: FileText, service: "reports" },
  { label: "Billing", href: "/portal/billing", icon: CreditCard, service: "billing" },
  { label: "Settings", href: "/portal/settings", icon: Settings },
]

/**
 * Builds the two-group NavGroup[] the Sidebar renders, keeping only the
 * services the given client has active. Dashboard sits ungrouped at the top,
 * everything else lands under "Suite" so the sections read as one unit.
 */
export function buildSuiteNav(activeServices: Set<ClientServiceKey>): NavGroup[] {
  const items = SUITE_ITEMS.filter(
    (item) => !item.service || activeServices.has(item.service),
  )

  // Shape expected by Sidebar: ungrouped Dashboard first, then a "Suite" group.
  const head = items.find((i) => i.href === "/portal/dashboard")
  const settings = items.find((i) => i.href === "/portal/settings")
  const middle = items.filter(
    (i) => i.href !== "/portal/dashboard" && i.href !== "/portal/settings",
  )

  const groups: NavGroup[] = []
  if (head) {
    groups.push({
      items: [{ label: head.label, href: head.href, icon: head.icon }],
    })
  }
  if (middle.length > 0) {
    groups.push({
      group: "Suite",
      items: middle.map((i) => ({
        label: i.label,
        href: i.href,
        icon: i.icon,
        ...(i.sub ? { sub: i.sub } : {}),
      })),
    })
  }
  if (settings) {
    groups.push({
      group: "Account",
      items: [{ label: settings.label, href: settings.href, icon: settings.icon }],
    })
  }
  return groups
}
