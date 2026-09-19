"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Sidebar } from "./sidebar"
import { PortalBackground } from "./portal-background"
import { CommandPalette } from "./command-palette"
import { StatusPill, type SystemHealth } from "./status-pill"

interface AppShellProps {
  children: React.ReactNode
  user?: { name?: string | null; email?: string | null }
  /** The organisation the signed-in user belongs to. One per user by design,
   *  so this is a label, not a switcher. */
  orgName?: string | null
  /** Server-checked on load — see /api/health. Omit only if the caller
   *  couldn't reach the check; the pill then starts in "Checking…" and
   *  resolves on its first client poll. */
  initialHealth?: SystemHealth | null
  /**
   * The bell button, badge and its dropdown — built and data-fetched by the
   * app (it needs a real Supabase query the shell has no business making).
   * Omitted entirely rather than shown non-functional: a bell that opens
   * nothing is worse than no bell.
   */
  notificationsSlot?: React.ReactNode
}

export function AppShell({
  children,
  user,
  orgName,
  initialHealth,
  notificationsSlot,
}: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)
  const [paletteOpen, setPaletteOpen] = React.useState(false)
  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "V"
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Account"

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base">
      <PortalBackground />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface px-4">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="flex h-8 w-full max-w-sm items-center gap-2 rounded-lg border border-border-subtle bg-bg-base px-3 text-xs text-text-disabled transition-colors hover:border-border focus-within:border-border"
          >
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 truncate text-left">Search anything...</span>
            <kbd className="shrink-0 rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-disabled">
              ⌘K
            </kbd>
          </button>

          <div className="flex shrink-0 items-center gap-3">
            <StatusPill initial={initialHealth ?? null} />

            {notificationsSlot}

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
