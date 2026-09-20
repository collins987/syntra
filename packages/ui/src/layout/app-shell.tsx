"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { PortalBackground } from "./portal-background"
import { CommandPalette } from "./command-palette"
import { TopBar } from "./top-bar"
import type { SystemHealth } from "./status-pill"

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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false)

  return (
    <div className="relative flex h-screen overflow-hidden bg-bg-base">
      <PortalBackground />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />

      <div className="relative flex flex-1 flex-col overflow-hidden">
        <TopBar
          user={user}
          orgName={orgName}
          initialHealth={initialHealth}
          notificationsSlot={notificationsSlot}
          onSearchClick={() => setPaletteOpen(true)}
          onMenuClick={() => setMobileNavOpen(true)}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}
