"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  LifeBuoy,
  Plus,
  Circle,
  Clock3,
  CheckCircle2,
  Archive,
  AlertTriangle,
} from "lucide-react"

import type {
  ClientProject,
  ClientSupportRequest,
  SupportPriority,
  SupportStatus,
} from "@syntra/db"

interface Props {
  initialRequests: ClientSupportRequest[]
  projects: ClientProject[]
}

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

type Tab = "all" | SupportStatus

export function SupportClient({ initialRequests, projects }: Props) {
  const router = useRouter()
  const [requests, setRequests] = useState<ClientSupportRequest[]>(initialRequests)
  const [tab, setTab] = useState<Tab>("all")
  const [showNew, setShowNew] = useState(false)

  const counts = {
    all: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    in_progress: requests.filter((r) => r.status === "in_progress").length,
    resolved: requests.filter((r) => r.status === "resolved").length,
    closed: requests.filter((r) => r.status === "closed").length,
  }
  const filtered = tab === "all" ? requests : requests.filter((r) => r.status === tab)

  function handleCreated(created: ClientSupportRequest) {
    setRequests((prev) => [created, ...prev])
    setShowNew(false)
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Support</h1>
          <p className="mt-1 text-sm text-text-muted">
            Request a change, flag an issue, or ask us a question. We acknowledge every request within one business day.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm transition hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" />
          {showNew ? "Close" : "New request"}
        </button>
      </div>

      {showNew && (
        <NewRequestForm
          projects={projects}
          onCancel={() => setShowNew(false)}
          onCreated={handleCreated}
        />
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["open", "Open"],
            ["in_progress", "In progress"],
            ["resolved", "Resolved"],
            ["closed", "Closed"],
          ] as Array<[Tab, string]>
        ).map(([key, label]) => {
          const count = counts[key]
          const active = tab === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex h-8 items-center gap-2 rounded-md border px-3 text-xs transition ${
                active
                  ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400"
                  : "border-border-subtle bg-bg-elevated text-text-muted hover:text-text-primary"
              }`}
            >
              <span>{label}</span>
              <span className="rounded bg-bg-base px-1.5 py-0.5 text-[10.5px] text-text-disabled">
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyRequests />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <RequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  )
}

function NewRequestForm({
  projects,
  onCancel,
  onCreated,
}: {
  projects: ClientProject[]
  onCancel: () => void
  onCreated: (r: ClientSupportRequest) => void
}) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<SupportPriority>("normal")
  const [projectId, setProjectId] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/support/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        priority,
        project_id: projectId || null,
      }),
    })
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      request?: ClientSupportRequest
      error?: string
    }
    setLoading(false)
    if (!res.ok || !payload.ok || !payload.request) {
      setError(payload.error ?? "Failed to submit.")
      return
    }
    onCreated(payload.request)
  }

  return (
    <form
      onSubmit={submit}
      className="mb-6 space-y-4 rounded-xl border border-border-subtle bg-bg-elevated p-5"
    >
      <div className="space-y-1.5">
        <label htmlFor="title" className="block text-sm font-medium text-text-secondary">
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="A short summary"
          className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={5}
          placeholder="What's happening? What would you like changed?"
          className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="priority" className="block text-sm font-medium text-text-secondary">
            Priority
          </label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as SupportPriority)}
            className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          >
            <option value="low">Low — whenever you can</option>
            <option value="normal">Normal — one business day</option>
            <option value="high">High — important</option>
            <option value="urgent">Urgent — now</option>
          </select>
        </div>

        {projects.length > 0 && (
          <div className="space-y-1.5">
            <label htmlFor="project" className="block text-sm font-medium text-text-secondary">
              Project (optional)
            </label>
            <select
              id="project"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              <option value="">No specific project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || !title.trim() || !description.trim()}
          className="flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {loading ? "Submitting…" : "Submit request"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex h-9 items-center rounded-md border border-border-subtle px-4 text-sm text-text-secondary transition hover:text-text-primary"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function RequestCard({ request }: { request: ClientSupportRequest }) {
  const meta = STATUS_META[request.status]
  const Icon = meta.icon
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      id={request.id}
      className="rounded-xl border border-border-subtle bg-bg-elevated p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="block w-full text-left text-sm font-semibold text-text-primary hover:text-cyan-400"
          >
            {request.title}
          </button>
          <p className="mt-0.5 text-[11px] text-text-disabled">
            {new Date(request.created_at).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
            {" · "}
            <span className={PRIORITY_META[request.priority]}>
              {request.priority}
            </span>
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${meta.className}`}
        >
          <Icon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-border-subtle pt-4">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-widest text-text-disabled">
              Description
            </p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
              {request.description}
            </p>
          </div>
          {request.response_note && (
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-widest text-cyan-400">
                Note from SYNTRA
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-text-secondary">
                {request.response_note}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyRequests() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
        <LifeBuoy className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-text-primary">No requests here.</p>
      <p className="mt-1 text-xs text-text-muted">
        If something needs changing, start a request — we&apos;ll pick it up fast.
      </p>
      <div className="mt-5 flex items-center justify-center gap-2 text-[11px] text-text-disabled">
        <AlertTriangle className="h-3 w-3" />
        <span>Email confirmations go to the address on your profile.</span>
      </div>
    </div>
  )
}
