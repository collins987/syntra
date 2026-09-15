"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { ActivityRow } from "@/lib/dashboard"
import type { WorkflowExecutionStatus } from "@syntra/db"

const DOT: Record<WorkflowExecutionStatus, string> = {
  running:   "bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,229,255,0.6)]",
  completed: "bg-[#2A3A4A]",
  retrying:  "bg-warning-400/80",
  failed:    "bg-error-400",
}

const BADGE: Record<WorkflowExecutionStatus, { label: string; cls: string }> = {
  running:   { label: "Running",   cls: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 ring-1 ring-cyan-500/10" },
  completed: { label: "Completed", cls: "bg-success-500/10 text-success-400 border border-success-500/20" },
  retrying:  { label: "Retrying",  cls: "bg-warning-400/10 text-warning-400 border border-warning-400/20" },
  failed:    { label: "Failed",    cls: "bg-error-500/10 text-error-400 border border-error-500/20" },
}

function clockTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function duration(ms: number | null) {
  if (ms === null) return "—"
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

interface AutomationMeta {
  name: string
  workflow_code: string | null
}

export function LiveActivity({
  initial,
  orgId,
  automationMeta,
}: {
  initial: ActivityRow[]
  orgId: string
  automationMeta: Record<string, AutomationMeta>
}) {
  const [rows, setRows] = useState<ActivityRow[]>(initial)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`workflow_executions:${orgId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_executions",
          filter: `org_id=eq.${orgId}`,
        },
        (payload) => {
          const row = payload.new as {
            id: string
            automation_id: string
            status: WorkflowExecutionStatus
            started_at: string
            duration_ms: number | null
            error: string | null
          } | null
          if (!row?.id) return

          const meta = automationMeta[row.automation_id]
          const next: ActivityRow = {
            id: row.id,
            automationName: meta?.name ?? "Unknown automation",
            workflowCode: meta?.workflow_code ?? null,
            status: row.status,
            startedAt: row.started_at,
            durationMs: row.duration_ms,
            error: row.error,
          }

          setRows((prev) => {
            const existing = prev.findIndex((r) => r.id === next.id)
            if (existing !== -1) {
              const copy = [...prev]
              copy[existing] = next
              return copy
            }
            return [next, ...prev].slice(0, 50)
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [orgId, automationMeta])

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Live System Activity
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-text-disabled">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success-400" />
          Live
        </span>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
            <Activity className="h-5 w-5 text-text-disabled" />
          </div>
          <p className="text-sm font-semibold text-text-primary">No activity yet</p>
          <p className="mt-1 max-w-[280px] text-xs text-text-muted">
            Once your automations start running, every execution appears here in real time.
          </p>
        </div>
      ) : (
        <div className="flex-1 divide-y divide-border-subtle/50 overflow-y-auto">
          {rows.map((row) => (
            <div
              key={row.id}
              className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg-surface/60"
            >
              <span className="w-[70px] shrink-0 font-mono text-[11px] text-text-disabled">
                {clockTime(row.startedAt)}
              </span>

              <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[row.status]}`} />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-semibold text-text-primary">
                    {row.automationName}
                  </span>
                  {row.workflowCode && (
                    <span className="shrink-0 font-mono text-[11px] text-text-disabled">
                      {row.workflowCode}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="shrink-0 font-mono text-[11px] text-text-disabled">
                    {duration(row.durationMs)}
                  </span>
                  {row.error && (
                    <span className="truncate text-[12px] text-error-400" title={row.error}>
                      {row.error}
                    </span>
                  )}
                </div>
              </div>

              <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium ${BADGE[row.status].cls}`}>
                {BADGE[row.status].label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
