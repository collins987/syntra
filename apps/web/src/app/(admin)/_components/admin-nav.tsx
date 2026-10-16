"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard, Users, TrendingUp, CreditCard, ArrowLeft,
  Activity, DollarSign, Cpu, UserPlus, LifeBuoy, Zap, Server,
} from "lucide-react"

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/clients", label: "Clients", icon: Users, exact: false },
  { href: "/admin/onboarding", label: "Onboarding", icon: UserPlus, exact: false },
  { href: "/admin/workflows", label: "Workflows", icon: Zap, exact: false },
  { href: "/admin/support", label: "Support", icon: LifeBuoy, exact: false },
  { href: "/admin/system", label: "System", icon: Server, exact: false },
  { href: "/admin/leads", label: "Leads", icon: TrendingUp, exact: false },
  { href: "/admin/subscriptions", label: "Subscriptions", icon: CreditCard, exact: false },
  { href: "/admin/economics", label: "Economics", icon: DollarSign, exact: false },
  { href: "/admin/ai", label: "AI", icon: Cpu, exact: false },
  { href: "/admin/health", label: "Health", icon: Activity, exact: false },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <aside className="flex w-52 shrink-0 flex-col border-r border-border-subtle">
      <div className="border-b border-border-subtle px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-widest text-cyan-400">SYNTRA</p>
        <p className="mt-0.5 text-[11px] text-text-disabled">Admin</p>
      </div>
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? "bg-cyan-500/10 text-cyan-400 font-medium"
                  : "text-text-muted hover:text-text-primary hover:bg-white/5"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="border-t border-border-subtle px-3 py-4">
        <Link
          href="/portal/dashboard"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-text-muted hover:text-text-primary transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to portal
        </Link>
      </div>
    </aside>
  )
}
