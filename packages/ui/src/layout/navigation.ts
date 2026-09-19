import type * as React from "react"
import {
  LayoutDashboard,
  Globe,
  Zap,
  Megaphone,
  Bot,
  Cpu,
  BarChart3,
  Building2,
  Users,
  FileText,
  CreditCard,
  Plug,
  Activity,
  Settings,
  ShieldCheck,
  Gauge,
} from "lucide-react"

export interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  /** Shown under the label in the Services group, so each product reads as
   *  what it does rather than as a bare noun. */
  sub?: string
}

export interface NavGroup {
  group?: string
  items: NavItem[]
}

// The single source of every portal destination — read by the sidebar and by
// the command palette (⌘K), so a new route added here appears in both without
// being typed out twice. Every route appears exactly once: two rows to the
// same destination is how a nav (or a palette) starts to feel arbitrary.
export const navigation: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
      { label: "Approvals", href: "/portal/approvals", icon: ShieldCheck },
    ],
  },
  {
    group: "Services",
    items: [
      { label: "Syntra Sites", href: "/portal/websites", icon: Globe, sub: "Website & SEO" },
      { label: "Syntra Flow", href: "/portal/automations", icon: Zap, sub: "Automation & workflows" },
      { label: "Syntra Marketing", href: "/portal/marketing", icon: Megaphone, sub: "Content & campaigns" },
      { label: "Lead Intelligence", href: "/portal/leads", icon: Users, sub: "Scoring & CRM" },
      { label: "AI Agents", href: "/portal/ai-agents", icon: Bot, sub: "Ava · Max · Leo" },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { label: "AI Center", href: "/portal/ai", icon: Cpu },
      { label: "AI Usage", href: "/portal/ai-usage", icon: Gauge },
      { label: "Analytics", href: "/portal/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "Business",
    items: [
      { label: "Clients", href: "/portal/clients", icon: Building2 },
      { label: "Reports", href: "/portal/reports", icon: FileText },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Integrations",  href: "/portal/integrations", icon: Plug },
      { label: "Activity Logs", href: "/portal/activity",     icon: Activity },
      { label: "Billing",       href: "/portal/billing",      icon: CreditCard },
      { label: "Settings",      href: "/portal/settings",     icon: Settings },
    ],
  },
]

/** Flattened for search — the palette matches across all items regardless
 *  of which group they live in. */
export const flatNavigation: NavItem[] = navigation.flatMap((g) => g.items)
