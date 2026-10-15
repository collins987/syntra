"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { LifeBuoy, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "../lib/utils"
import { navigation as defaultNavigation, type NavGroup } from "./navigation"

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  /** Below `lg` the sidebar is an off-canvas drawer rather than a fixed
   *  column — there was no mobile handling here at all before this: an
   *  always-visible 240px (or 52px collapsed) column permanently ate a third
   *  to two-thirds of a phone-width screen. */
  mobileOpen: boolean
  onMobileClose: () => void
  /**
   * Optional override of the default org-based navigation. Personal-account
   * clients (SYNTRA Suite, Phase 2) pass a service-filtered version so each
   * client sees only the services they have active.
   */
  nav?: NavGroup[] | undefined
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, nav }: SidebarProps) {
  const pathname = usePathname()
  const navigation = nav ?? defaultNavigation

  // The drawer closes on navigation — staying open after a tap would leave a
  // phone-width user looking at the nav instead of the page they just chose.
  React.useEffect(() => {
    onMobileClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  return (
    <>
      {/* Backdrop — mobile only, and only while the drawer is open. */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          onClick={onMobileClose}
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={cn(
          "flex h-screen flex-col border-r border-border-subtle bg-bg-surface transition-all duration-150",
          collapsed ? "lg:w-[52px]" : "lg:w-60",
          // Mobile: fixed drawer, off-canvas by default, full nav width when
          // open regardless of the desktop collapsed state (an icon-only
          // drawer is hard to tap navigate). Desktop: back to normal document
          // flow, always visible, honouring `collapsed`.
          "fixed inset-y-0 left-0 z-40 w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "lg:static lg:z-auto lg:translate-x-0"
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
        {navigation.map((group, groupIndex) => (
          <div key={group.group ?? `group-${groupIndex}`} className="mb-4 px-2">
            {!collapsed && group.group && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
                {group.group}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href || pathname?.startsWith(item.href + "/")
              const Icon = item.icon
              const showSub = !collapsed && Boolean(item.sub)

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative mb-0.5 flex items-center gap-2.5 rounded-lg text-[13px] transition-colors duration-100",
                    collapsed ? "justify-center py-1.5" : "px-2.5",
                    showSub ? "py-1.5" : "h-8",
                    isActive
                      ? "bg-cyan-500/[0.14] text-cyan-400"
                      : "text-text-muted hover:bg-bg-overlay/40 hover:text-text-secondary"
                  )}
                >
                  {/* Accent rail — the active row reads at a glance without
                      needing a heavier fill that would fight the cards. */}
                  {isActive && !collapsed && (
                    <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-cyan-400" />
                  )}
                  <Icon
                    className={cn(
                      "shrink-0",
                      showSub ? "h-4 w-4" : "h-3.5 w-3.5",
                      isActive ? "text-cyan-400" : ""
                    )}
                  />
                  {!collapsed && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate leading-tight">{item.label}</span>
                      {item.sub && (
                        <span className="block truncate text-[10.5px] leading-tight text-text-disabled">
                          {item.sub}
                        </span>
                      )}
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Support. mailto rather than a /portal/support route, because that
          route does not exist and a dead nav link is worse than none. */}
      {!collapsed && (
        <div className="shrink-0 px-3 pb-3">
          <div className="rounded-xl border border-border-subtle bg-bg-elevated p-3">
            <div className="flex items-center gap-2">
              <LifeBuoy className="h-3.5 w-3.5 shrink-0 text-cyan-400" />
              <p className="text-[12px] font-medium text-text-primary">Need help?</p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-text-muted">
              Our team is here to support you.
            </p>
            <a
              href="mailto:support@syntraco.tech"
              className="mt-2.5 flex h-7 items-center justify-center rounded-lg bg-cyan-500/15 text-[11px] font-semibold text-cyan-400 transition-colors hover:bg-cyan-500/25"
            >
              Contact support
            </a>
          </div>
        </div>
      )}

      {/* Collapse toggle — desktop only. On mobile the drawer is always full
          width regardless of `collapsed` (an icon-only drawer is hard to tap
          navigate), so this control would do nothing visible there. */}
      <div className="hidden shrink-0 border-t border-border-subtle lg:block">
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
    </>
  )
}
