"use client"

import * as React from "react"
import { Bell, CheckCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface NotificationRow {
  id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  created_at: string
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

/**
 * The bell, its unread badge and dropdown, as one self-contained unit. Lives
 * in apps/web rather than the shared UI package because it needs a real
 * Supabase query — RLS scopes every read and write to the signed-in user
 * (`user_id = auth.uid()`, migration 011), so this is safe to run directly
 * from the browser rather than through an API route.
 */
export function NotificationsBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [open, setOpen] = React.useState(false)
  const [rows, setRows] = React.useState<NotificationRow[] | null>(null)
  const [unread, setUnread] = React.useState(initialUnreadCount)
  const [loading, setLoading] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // New notifications arrive live rather than only on next page load — the
  // same postgres_changes pattern the dashboard's activity feed already uses.
  React.useEffect(() => {
    const supabase = createClient()
    let userId: string | null = null

    supabase.auth.getUser().then(({ data }) => {
      userId = data.user?.id ?? null
      if (!userId) return

      const channel = supabase
        .channel(`notifications:${userId}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new as NotificationRow
            setUnread((n) => n + 1)
            setRows((prev) => (prev ? [row, ...prev].slice(0, 8) : prev))
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    })
  }, [])

  React.useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClickOutside)
    document.addEventListener("keydown", onEscape)
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onEscape)
    }
  }, [open])

  async function handleOpen() {
    const next = !open
    setOpen(next)
    if (next && rows === null) {
      setLoading(true)
      const supabase = createClient()
      const { data } = await supabase
        .from("notifications")
        .select("id, type, title, body, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(8)
      setRows((data as NotificationRow[] | null) ?? [])
      setLoading(false)
    }
  }

  async function markAllRead() {
    if (unread === 0) return
    setUnread(0)
    setRows((prev) => prev?.map((r) => ({ ...r, read_at: r.read_at ?? new Date().toISOString() })) ?? prev)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any
    await db.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null)
  }

  async function markOneRead(row: NotificationRow) {
    if (row.read_at) return
    setUnread((n) => Math.max(0, n - 1))
    setRows((prev) => prev?.map((r) => (r.id === row.id ? { ...r, read_at: new Date().toISOString() } : r)) ?? prev)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createClient() as any
    await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", row.id)
  }

  const hasUnread = unread > 0

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        aria-label={hasUnread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle text-text-muted transition-colors hover:border-border hover:text-text-secondary"
      >
        <Bell className="h-4 w-4" />
        {hasUnread && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-cyan-500 px-1 font-mono text-[9px] font-bold text-bg-base">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-10 z-40 w-80 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-modal"
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-3.5 py-2.5">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
              Notifications
            </span>
            {hasUnread && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-[10.5px] font-medium text-cyan-400 transition-colors hover:text-cyan-300"
              >
                <CheckCheck className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-text-disabled">Loading…</p>
            ) : !rows || rows.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-[12px] text-text-disabled">
                Nothing yet — you&apos;re all caught up.
              </p>
            ) : (
              <ul className="divide-y divide-border-subtle/60">
                {rows.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => markOneRead(row)}
                      className="flex w-full items-start gap-2 px-3.5 py-2.5 text-left transition-colors hover:bg-bg-elevated/60"
                    >
                      <span
                        className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                          row.read_at ? "bg-transparent" : "bg-cyan-400"
                        }`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-text-primary">
                          {row.title}
                        </span>
                        {row.body && (
                          <span className="mt-0.5 block truncate text-[11px] text-text-muted">
                            {row.body}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[10px] text-text-disabled">
                          {timeAgo(row.created_at)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
