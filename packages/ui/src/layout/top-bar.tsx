"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { StatusPill, type SystemHealth } from "./status-pill"

export interface TopBarProps {
  user?: { name?: string | null; email?: string | null } | undefined
  /** One per user by design — a label, not a switcher. */
  orgName?: string | null | undefined
  initialHealth?: SystemHealth | null | undefined
  /** Built and data-fetched by the app; omitted entirely rather than shown
   *  non-functional — see AppShell for why. */
  notificationsSlot?: React.ReactNode
  onSearchClick: () => void
}

export function TopBar({ user, orgName, initialHealth, notificationsSlot, onSearchClick }: TopBarProps) {
  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "V"
  const displayName = user?.name ?? user?.email?.split("@")[0] ?? "Account"

  return (
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface px-4">
      <button
        type="button"
        onClick={onSearchClick}
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
            <span className="font-mono text-[11px] font-semibold text-cyan-400">{initials}</span>
          </div>
          <div className="hidden min-w-0 leading-tight md:block">
            <p className="truncate text-xs font-medium text-text-primary">{displayName}</p>
            {orgName && <p className="truncate text-[11px] text-text-muted">{orgName}</p>}
          </div>
        </div>
      </div>
    </header>
  )
}
