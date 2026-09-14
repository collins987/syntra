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
  const initials = user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "V"

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle bg-bg-surface px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-56 items-center gap-2 rounded border border-border-subtle bg-bg-base px-2.5 text-xs text-text-disabled transition-colors focus-within:border-border">
              <Search className="h-3 w-3 shrink-0" />
              <span className="flex-1 font-mono">Search...</span>
              <kbd className="rounded border border-border-subtle px-1 font-mono text-[10px] text-text-disabled">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={cn(
                "relative flex h-7 w-7 items-center justify-center rounded border border-border-subtle",
                "text-text-muted transition-colors hover:border-border hover:text-text-secondary"
              )}
            >
              <Bell className="h-3.5 w-3.5" />
              <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-cyan-500" />
            </button>

            <div className="flex items-center gap-2 pl-1">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border-subtle bg-bg-elevated">
                <span className="font-mono text-[10px] font-semibold text-text-secondary">
                  {initials}
                </span>
              </div>
              <span className="hidden font-mono text-xs text-text-muted md:block">
                {user?.name ?? user?.email?.split("@")[0] ?? "Vincent"}
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
