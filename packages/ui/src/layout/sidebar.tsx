"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
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
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "../lib/utils"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navigation: NavGroup[] = [
  {
    group: "Overview",
    items: [
      { label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard },
      { label: "Approvals", href: "/portal/approvals", icon: ShieldCheck },
    ],
  },
  {
    group: "Workspace",
    items: [
      { label: "Websites", href: "/portal/websites", icon: Globe },
      { label: "Automations", href: "/portal/automations", icon: Zap },
      { label: "Marketing", href: "/portal/marketing", icon: Megaphone },
      { label: "AI Agents", href: "/portal/ai-agents", icon: Bot },
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
      { label: "Leads", href: "/portal/leads", icon: Users },
      { label: "Reports", href: "/portal/reports", icon: FileText },
      { label: "Billing", href: "/portal/billing", icon: CreditCard },
    ],
  },
  {
    group: "System",
    items: [
      { label: "Integrations",  href: "/portal/integrations", icon: Plug },
      { label: "Activity Logs", href: "/portal/activity",     icon: Activity },
      { label: "Settings",      href: "/portal/settings",     icon: Settings },
    ],
  },
]

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside
      className={cn(
        "flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-all duration-150",
        collapsed ? "w-[52px]" : "w-56"
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-12 shrink-0 items-center border-b border-border-subtle",
          collapsed ? "justify-center" : "px-4"
        )}
      >
        {collapsed ? (
          <Image src="/logo-mark.png" alt="SYNTRA" width={24} height={24} className="h-6 w-6" />
        ) : (
          <div className="flex items-center gap-2">
            <Image src="/logo-mark.png" alt="SYNTRA" width={24} height={24} className="h-6 w-6" />
            <span className="text-[13px] font-semibold tracking-wider text-text-primary">
              SYNTRA
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navigation.map((group) => (
          <div key={group.group} className="mb-4">
            {!collapsed && (
              <p className="mb-0.5 px-3 text-[10px] font-medium tracking-widest text-text-disabled">
                {group.group.toUpperCase()}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/")
              const Icon = item.icon

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-7 items-center gap-2.5 text-[13px] transition-colors duration-100",
                    collapsed ? "justify-center" : "px-3",
                    isActive
                      ? "rounded-md bg-cyan-500/15 text-cyan-400"
                      : "text-text-muted hover:bg-bg-overlay/40 hover:text-text-secondary"
                  )}
                >
                  <Icon className={["h-3.5 w-3.5 shrink-0", isActive ? "text-cyan-400" : ""].join(" ")} />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="shrink-0 border-t border-border-subtle">
        <button
          onClick={onToggle}
          className={cn(
            "flex h-9 w-full items-center gap-2 text-[12px] text-text-disabled transition-colors duration-100 hover:bg-bg-overlay/40 hover:text-text-muted",
            collapsed ? "justify-center" : "px-4"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
