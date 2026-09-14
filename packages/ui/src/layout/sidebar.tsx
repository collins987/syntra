"use client"

import * as React from "react"
import Link from "next/link"
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
    group: "OVERVIEW",
    items: [{ label: "Dashboard", href: "/portal/dashboard", icon: LayoutDashboard }],
  },
  {
    group: "WORKSPACE",
    items: [
      { label: "Websites", href: "/portal/websites", icon: Globe },
      { label: "Automations", href: "/portal/automations", icon: Zap },
      { label: "Marketing", href: "/portal/marketing", icon: Megaphone },
      { label: "AI Agents", href: "/portal/ai-agents", icon: Bot },
    ],
  },
  {
    group: "INTELLIGENCE",
    items: [
      { label: "AI Center", href: "/portal/ai", icon: Cpu },
      { label: "Analytics", href: "/portal/analytics", icon: BarChart3 },
    ],
  },
  {
    group: "BUSINESS",
    items: [
      { label: "Clients", href: "/portal/clients", icon: Building2 },
      { label: "Leads", href: "/portal/leads", icon: Users },
      { label: "Reports", href: "/portal/reports", icon: FileText },
      { label: "Billing", href: "/portal/billing", icon: CreditCard },
    ],
  },
  {
    group: "SYSTEM",
    items: [
      { label: "Integrations", href: "/portal/integrations", icon: Plug },
      { label: "Activity", href: "/portal/activity", icon: Activity },
      { label: "Settings", href: "/portal/settings", icon: Settings },
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
        "flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-all duration-200",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex h-14 items-center border-b border-border-subtle px-4", collapsed && "justify-center")}>
        {collapsed ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500">
            <span className="text-xs font-bold text-bg-base">S</span>
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500">
              <span className="text-xs font-bold text-bg-base">S</span>
            </div>
            <span className="text-sm font-semibold tracking-wide text-text-primary">SYNTRA</span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {navigation.map((group) => (
          <div key={group.group}>
            {!collapsed && (
              <p className="mb-1.5 px-2 text-[10px] font-semibold tracking-widest text-text-disabled">
                {group.group}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
                const Icon = item.icon

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "relative flex h-8 items-center gap-2.5 rounded-md px-2 text-sm transition-colors duration-[120ms]",
                      isActive
                        ? "bg-bg-overlay text-text-primary"
                        : "text-text-muted hover:bg-bg-overlay hover:text-text-secondary",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-cyan-500" />
                    )}
                    <Icon className={cn("h-4 w-4 shrink-0", isActive && "text-cyan-400")} />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-border-subtle p-2">
        <button
          onClick={onToggle}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-md px-2 text-xs text-text-muted hover:bg-bg-overlay hover:text-text-secondary transition-colors duration-[120ms]",
            collapsed && "justify-center"
          )}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : (
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
