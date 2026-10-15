"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Circle,
  Clock3,
  CheckCircle2,
  Archive,
  Mail,
  User,
  Save,
} from "lucide-react"

import type {
  SupportPriority,
  SupportRequest,
  SupportStatus,
} from "@syntra/db"

export interface AdminQueueRow extends SupportRequest {
  client_full_name: string
  client_email: string
}

interface Props {
  initialRows: AdminQueueRow[]
}

const STATUSES: SupportStatus[] = ["open", "in_progress", "resolved", "closed"]
const PRIORITIES: SupportPriority[] = ["urgent", "high", "normal", "low"]

const STATUS_META: Record<
  SupportStatus,
  { label: string; icon: typeof Circle; className: string }
> = {
  open: {
    label: "Open",
    icon: Circle,
    className: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  },
  in_progress: {
    label: "In progress",
    icon: Clock3,
    className: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle2,
    className: "border-success-500/20 bg-success-500/10 text-success-400",
  },
  closed: {
    label: "Closed",
    icon: Archive,
    className: "border-border-subtle bg-bg-surface text-text-muted",
  },
}

const PRIORITY_META: Record<SupportPriority, string> = {
  low: "text-text-disabled",
  normal: "text-text-muted",
  high: "text-warning-400",
  urgent: "text-error-400",
}

export function QueueClient({ initialRows }: Props) {
  const [rows, setRows] = useState<AdminQueueRow[]>(initialRows)
  const [statusFilter, setStatusFilter] = useState<SupportStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<SupportPriority | "all">(
    "all",
  )

  const filtered = rows.filter((r) => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false
    return true
  })

  function updateRow(id: string, patch: Partial<AdminQueueRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Support queue</h1>
        <p className="mt-1 text-sm text-text-muted">
          Every request across every personal-account client. Status transitions email the client automatically.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={(v) => setStatusFilter(v as SupportStatus | "all")}
          options={[
            ["all", "All"],
            ...STATUSES.map((s) => [s, STATUS_META[s].label] as [string, string]),
          ]}
        />
        <FilterSelect
          label="Priority"
          value={priorityFilter}
          onChange={(v) => setPriorityFilter(v as SupportPriority | "all")}
          options={[
            ["all", "All"],
            ...PRIORITIES.map((p) => [p, p] as [string, string]),
          ]}
        />
        <p className="ml-auto text-xs text-text-disabled">
          Showing {filtered.length} of {rows.length}
        </p>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center text-sm text-text-disabled">
          Nothing in this slice.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestRow key={r.id} row={r} onPatch={(patch) => updateRow(r.id, patch)} />
          ))}
        </div>
      )}
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: Array<[string, string]>
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
      >
        {options.map(([val, label]) => (
          <option key={val} value={val}>
            {label}
          </option>
        ))}
      </select>
    </label>
  )
}

function RequestRow({
  row,
  onPatch,
}: {
  row: AdminQueueRow
  onPatch: (patch: Partial<AdminQueueRow>) => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [status, setStatus] = useState<SupportStatus>(row.status)
  const [responseNote, setResponseNote] = useState(row.response_note ?? "")
  const [internalNote, setInternalNote] = useState(row.internal_note ?? "")
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setBanner(null)
    const dirtyStatus = status !== row.status
    const dirtyResponse = (responseNote || null) !== row.response_note
    const dirtyInternal = (internalNote || null) !== row.internal_note

    if (!dirtyStatus && !dirtyResponse && !dirtyInternal) {
      setSaving(false)
      return
    }

    const endpoint = dirtyStatus
      ? `/api/support/${row.id}/status`
      : `/api/support/${row.id}`
    const body: Record<string, unknown> = {}
    if (dirtyStatus) body["status"] = status
    if (dirtyResponse) body["response_note"] = responseNote || null
    if (dirtyInternal) body["internal_note"] = internalNote || null

    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setSaving(false)
    if (!res.ok || !payload.ok) {
      setBanner(payload.error ?? "Save failed.")
      return
    }
    onPatch({
      status,
      response_note: responseNote || null,
      internal_note: internalNote || null,
    })
    router.refresh()
  }

  const meta = STATUS_META[row.status]
  const Icon = meta.icon

  return (
    <div
      id={row.id}
      className="rounded-xl border border-border-subtle bg-bg-elevated"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{row.title}</p>
          <p className="mt-0.5 flex items-center gap-3 text-[11px] text-text-disabled">
            <span className="inline-flex items-center gap-1">
              <User className="h-3 w-3" /> {row.client_full_name}
            </span>
            <span className="inline-flex items-center gap-1">
              <Mail className="h-3 w-3" /> {row.client_email}
            </span>
            <span className={PRIORITY_META[row.priority]}>{row.priority}</span>
            <span>
              {new Date(row.created_at).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${meta.className}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </button>

      {expanded && (
        <div className="space-y-4 border-t border-border-subtle px-5 py-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-text-disabled">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
              {row.description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupportStatus)}
                className="h-8 w-full rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_META[s].label}
                  </option>
                ))}
              </select>
              <p className="text-[10.5px] text-text-disabled">
                Flipping to in_progress, resolved, or closed emails the client.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary">
              Response note (client-visible)
            </label>
            <textarea
              value={responseNote}
              onChange={(e) => setResponseNote(e.target.value)}
              rows={3}
              placeholder="What should the client see? Goes into the status-update email too."
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-secondary">
              Internal note (admin-only)
            </label>
            <textarea
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              rows={2}
              placeholder="Private context, next steps, who's assigned. Never shown to the client."
              className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {banner && (
            <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
              {banner}
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-cyan-500 px-4 text-xs font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save & notify"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
