"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Zap, Check, Plus, Trash2 } from "lucide-react"

import type { ClientWorkflowStatus } from "@syntra/db"

import type { AdminWorkflowRow } from "@/lib/admin/workflows"

interface Props {
  userId: string
  allWorkflows: AdminWorkflowRow[]
  initialAssigned: string[]
}

const STATUS_META: Record<
  ClientWorkflowStatus,
  { label: string; className: string }
> = {
  active: {
    label: "Active",
    className: "border-success-500/20 bg-success-500/10 text-success-400",
  },
  inactive: {
    label: "Paused",
    className: "border-border-subtle bg-bg-surface text-text-muted",
  },
  error: {
    label: "Error",
    className: "border-error-500/20 bg-error-500/10 text-error-400",
  },
}

/**
 * Per-client workflow assignment panel. Rendered on the admin client detail
 * page, below the profile editor. Toggling here calls /api/admin/workflows/
 * [id]/assign and only mutates the join table — never the workflow itself.
 */
export function WorkflowAssignments({ userId, allWorkflows, initialAssigned }: Props) {
  const router = useRouter()
  const [assigned, setAssigned] = useState<Set<string>>(new Set(initialAssigned))
  const [pending, setPending] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  async function toggle(workflowId: string) {
    const isAssigned = assigned.has(workflowId)
    setPending(workflowId)
    setBanner(null)

    const res = isAssigned
      ? await fetch(
          `/api/admin/workflows/${workflowId}/assign?user_id=${encodeURIComponent(userId)}`,
          { method: "DELETE" },
        )
      : await fetch(`/api/admin/workflows/${workflowId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: userId }),
        })

    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setPending(null)
    if (!res.ok || !payload.ok) {
      setBanner(payload.error ?? "Failed to update assignment.")
      return
    }

    setAssigned((prev) => {
      const next = new Set(prev)
      if (isAssigned) next.delete(workflowId)
      else next.add(workflowId)
      return next
    })
    router.refresh()
  }

  const assignedCount = assigned.size

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
          Workflows
        </h2>
        <span className="text-[11px] text-text-disabled">
          {assignedCount} assigned
        </span>
      </div>

      {banner && (
        <div className="mb-3 rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-xs text-error-400">
          {banner}
        </div>
      )}

      {allWorkflows.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-subtle px-3 py-4 text-center text-xs text-text-disabled">
          No workflows in the catalogue yet. Create one in{" "}
          <a href="/admin/workflows" className="text-cyan-400 hover:text-cyan-300">
            /admin/workflows
          </a>{" "}
          first.
        </p>
      ) : (
        <ul className="space-y-2">
          {allWorkflows.map((w) => {
            const isAssigned = assigned.has(w.id)
            const meta = STATUS_META[w.status]
            const isPending = pending === w.id
            return (
              <li
                key={w.id}
                className={`flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition ${
                  isAssigned
                    ? "border-cyan-500/30 bg-cyan-500/5"
                    : "border-border-subtle bg-bg-surface"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 shrink-0 text-text-muted" />
                    <p className="truncate text-sm text-text-primary">{w.name}</p>
                    <span
                      className={`inline-flex items-center rounded border px-1.5 py-0 text-[10px] ${meta.className}`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {w.description && (
                    <p className="mt-0.5 line-clamp-1 pl-5 text-[11px] text-text-disabled">
                      {w.description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggle(w.id)}
                  disabled={isPending}
                  className={`inline-flex h-7 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs transition disabled:opacity-50 ${
                    isAssigned
                      ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/15"
                      : "border-border-subtle bg-bg-elevated text-text-secondary hover:text-text-primary"
                  }`}
                >
                  {isAssigned ? (
                    <>
                      <Check className="h-3 w-3" />
                      Assigned
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Assign
                    </>
                  )}
                </button>
                {isAssigned && (
                  <button
                    type="button"
                    aria-label="Unassign"
                    onClick={() => toggle(w.id)}
                    disabled={isPending}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border-subtle text-text-disabled transition hover:border-error-500/30 hover:text-error-400 disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
