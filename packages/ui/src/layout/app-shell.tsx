"use client"

import * as React from "react"
import { Bell, Search } from "lucide-react"
import { Sidebar } from "./sidebar"
import { PortalBackground } from "./portal-background"
import { cn } from "../lib/utils"

interface AppShellProps {
  children: React.ReactNode
  user?: { name?: string | null; email?: string | null }
  /** The organisation the signed-in user belongs to. One per user by design,
   *  so this is a label, not a switcher. */
  orgName?: string | null
  /** Unread notifications. Undefined means "not loaded", which renders no
   *  badge at all rather than a zero. */
  unreadCount?: number
}

export function AppShell({ children, user, orgName, unreadCount }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "V"
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Account"
  const hasUnread = typeof unreadCount === "number" && unreadCount > 0

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base">
      <PortalBackground />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface px-4">
          <div className="flex h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-disabled transition-colors focus-within:border-border">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate">Search anything...</span>
            <kbd className="shrink-0 rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-disabled">
              ⌘K
            </kbd>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <button
              aria-label={hasUnread ? `Notifications, ${unreadCount} unread` : "Notifications"}
              className={cn(
                "relative flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle",
                "text-text-muted transition-colors hover:border-border hover:text-text-secondary"
              )}
            >
              <Bell className="h-4 w-4" />
              {hasUnread && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 font-mono text-[9px] font-bold text-bg-base">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <div className="flex items-center gap-2.5 border-l border-border-subtle pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-500/25 bg-cyan-500/10">
                <span className="font-mono text-[11px] font-semibold text-cyan-400">
                  {initials}
                </span>
              </div>
              <div className="hidden min-w-0 leading-tight md:block">
                <p className="truncate text-xs font-medium text-text-primary">{displayName}</p>
                {orgName && <p className="truncate text-[11px] text-text-muted">{orgName}</p>}
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
