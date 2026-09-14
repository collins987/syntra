"use client"

import * as React from "react"
import { Bell, Search } from "lucide-react"
import { Sidebar } from "./sidebar"
import { cn } from "../lib/utils"

interface AppShellProps {
  children: React.ReactNode
  user?: { name?: string | null; email?: string | null }
}

export function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-64 items-center gap-2 rounded-md border border-border-subtle bg-bg-elevated px-3 text-sm text-text-muted">
              <Search className="h-3.5 w-3.5" />
              <span>Search...</span>
              <kbd className="ml-auto rounded border border-border-subtle px-1.5 text-[10px] font-mono text-text-disabled">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative flex h-8 w-8 items-center justify-center rounded-md border border-border-subtle text-text-muted hover:text-text-primary transition-colors duration-[120ms]">
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-xs font-semibold text-cyan-400">
                  {user?.name?.[0]?.toUpperCase() ?? "V"}
                </span>
              </div>
              <span className="text-sm text-text-secondary hidden md:block">
                {user?.name ?? "Vincent"}
              </span>
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
