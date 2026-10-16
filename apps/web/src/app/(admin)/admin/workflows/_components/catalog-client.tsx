"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Zap, Trash2, Pencil, Save, X } from "lucide-react"

import type { ClientWorkflowStatus } from "@syntra/db"

import type { AdminWorkflowRow } from "@/lib/admin/workflows"

interface Props {
  initialWorkflows: AdminWorkflowRow[]
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

export function CatalogClient({ initialWorkflows }: Props) {
  const router = useRouter()
  const [workflows, setWorkflows] = useState<AdminWorkflowRow[]>(initialWorkflows)
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)

  function refresh() {
    router.refresh()
  }

  async function createWorkflow(input: {
    name: string
    description: string
    n8n_workflow_id: string
    status: ClientWorkflowStatus
    time_saved_minutes: number
    cost_saved_usd: number
  }) {
    const res = await fetch("/api/admin/workflows", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name,
        description: input.description || null,
        n8n_workflow_id: input.n8n_workflow_id || null,
        status: input.status,
        time_saved_minutes: input.time_saved_minutes,
        cost_saved_usd: input.cost_saved_usd,
      }),
    })
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      workflow?: AdminWorkflowRow
      error?: string
    }
    if (!res.ok || !payload.ok || !payload.workflow) {
      setBanner(payload.error ?? "Failed to create.")
      return false
    }
    setWorkflows((prev) => [{ ...payload.workflow!, assigned_count: 0 }, ...prev])
    setBanner(null)
    refresh()
    return true
  }

  async function updateWorkflow(id: string, patch: Partial<AdminWorkflowRow>) {
    const body: Record<string, unknown> = {}
    if (patch.name !== undefined) body["name"] = patch.name
    if (patch.description !== undefined) body["description"] = patch.description
    if (patch.n8n_workflow_id !== undefined)
      body["n8n_workflow_id"] = patch.n8n_workflow_id
    if (patch.status !== undefined) body["status"] = patch.status
    if (patch.time_saved_minutes !== undefined)
      body["time_saved_minutes"] = patch.time_saved_minutes
    if (patch.cost_saved_usd !== undefined)
      body["cost_saved_usd"] = patch.cost_saved_usd

    const res = await fetch(`/api/admin/workflows/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!res.ok || !payload.ok) {
      setBanner(payload.error ?? "Failed to save.")
      return false
    }
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)))
    setBanner(null)
    refresh()
    return true
  }

  async function deleteWorkflow(id: string) {
    if (!confirm("Delete this workflow? Assignments will be removed from all clients.")) return
    const res = await fetch(`/api/admin/workflows/${id}`, { method: "DELETE" })
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    if (!res.ok || !payload.ok) {
      setBanner(payload.error ?? "Failed to delete.")
      return
    }
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    setBanner(null)
    refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Workflows</h1>
          <p className="mt-1 text-sm text-text-muted">
            The automation catalogue clients see in /portal/automations. Assign workflows to clients from their detail page.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNew((v) => !v)}
          className="flex h-9 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm transition hover:bg-cyan-400"
        >
          <Plus className="h-4 w-4" />
          {showNew ? "Close" : "New workflow"}
        </button>
      </div>

      {banner && (
        <div className="mb-4 rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
          {banner}
        </div>
      )}

      {showNew && (
        <NewWorkflowForm
          onCancel={() => setShowNew(false)}
          onCreate={async (input) => {
            const ok = await createWorkflow(input)
            if (ok) setShowNew(false)
          }}
        />
      )}

      {workflows.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center">
          <Zap className="mx-auto h-6 w-6 text-text-disabled" />
          <p className="mt-3 text-sm text-text-muted">
            No workflows in the catalogue yet. Create one to make it assignable to clients.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) =>
            editingId === w.id ? (
              <EditRow
                key={w.id}
                workflow={w}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  const ok = await updateWorkflow(w.id, patch)
                  if (ok) setEditingId(null)
                }}
              />
            ) : (
              <WorkflowRow
                key={w.id}
                workflow={w}
                onEdit={() => setEditingId(w.id)}
                onDelete={() => deleteWorkflow(w.id)}
              />
            ),
          )}
        </div>
      )}
    </div>
  )
}

function WorkflowRow({
  workflow,
  onEdit,
  onDelete,
}: {
  workflow: AdminWorkflowRow
  onEdit: () => void
  onDelete: () => void
}) {
  const meta = STATUS_META[workflow.status]
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <p className="text-sm font-semibold text-text-primary">{workflow.name}</p>
          <span
            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${meta.className}`}
          >
            {meta.label}
          </span>
        </div>
        {workflow.description && (
          <p className="mt-1 text-xs text-text-muted">{workflow.description}</p>
        )}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-disabled">
          <span>{workflow.time_saved_minutes}m saved / run</span>
          <span>${Number(workflow.cost_saved_usd).toFixed(2)} saved / run</span>
          <span>
            {workflow.assigned_count} client{workflow.assigned_count === 1 ? "" : "s"}
          </span>
          {workflow.n8n_workflow_id && (
            <span className="font-mono">n8n:{workflow.n8n_workflow_id}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border-subtle px-3 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <Pencil className="h-3 w-3" />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-error-500/20 bg-error-500/5 px-3 text-xs text-error-400 transition hover:bg-error-500/15"
        >
          <Trash2 className="h-3 w-3" />
          Delete
        </button>
      </div>
    </div>
  )
}

function NewWorkflowForm({
  onCancel,
  onCreate,
}: {
  onCancel: () => void
  onCreate: (input: {
    name: string
    description: string
    n8n_workflow_id: string
    status: ClientWorkflowStatus
    time_saved_minutes: number
    cost_saved_usd: number
  }) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [n8nId, setN8nId] = useState("")
  const [status, setStatus] = useState<ClientWorkflowStatus>("active")
  const [timeSaved, setTimeSaved] = useState("")
  const [costSaved, setCostSaved] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await onCreate({
      name: name.trim(),
      description: description.trim(),
      n8n_workflow_id: n8nId.trim(),
      status,
      time_saved_minutes: Number(timeSaved) || 0,
      cost_saved_usd: Number(costSaved) || 0,
    })
    setSubmitting(false)
  }

  return (
    <form
      onSubmit={submit}
      className="mb-5 space-y-4 rounded-xl border border-border-subtle bg-bg-elevated p-5"
    >
      <FormInput id="name" label="Workflow name" value={name} onChange={setName} required />
      <div className="space-y-1.5">
        <label htmlFor="description" className="block text-sm font-medium text-text-secondary">
          Description
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="What does this workflow do?"
          className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <FormInput
          id="n8n_id"
          label="n8n workflow ID (optional)"
          value={n8nId}
          onChange={setN8nId}
          placeholder="e.g. 42"
        />
        <div className="space-y-1.5">
          <label htmlFor="status" className="block text-sm font-medium text-text-secondary">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientWorkflowStatus)}
            className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Paused</option>
            <option value="error">Error</option>
          </select>
        </div>
        <FormInput
          id="time_saved"
          label="Time saved per run (minutes)"
          value={timeSaved}
          onChange={setTimeSaved}
          type="number"
          placeholder="0"
        />
        <FormInput
          id="cost_saved"
          label="Cost saved per run (USD)"
          value={costSaved}
          onChange={setCostSaved}
          type="number"
          placeholder="0"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
        >
          {submitting ? "Creating…" : "Create workflow"}
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

function EditRow({
  workflow,
  onSave,
  onCancel,
}: {
  workflow: AdminWorkflowRow
  onSave: (patch: Partial<AdminWorkflowRow>) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(workflow.name)
  const [description, setDescription] = useState(workflow.description ?? "")
  const [n8nId, setN8nId] = useState(workflow.n8n_workflow_id ?? "")
  const [status, setStatus] = useState<ClientWorkflowStatus>(workflow.status)
  const [timeSaved, setTimeSaved] = useState(String(workflow.time_saved_minutes))
  const [costSaved, setCostSaved] = useState(String(workflow.cost_saved_usd))
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await onSave({
      name,
      description: description || null,
      n8n_workflow_id: n8nId || null,
      status,
      time_saved_minutes: Number(timeSaved) || 0,
      cost_saved_usd: Number(costSaved) || 0,
    })
    setSaving(false)
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5"
    >
      <FormInput id={`e-name-${workflow.id}`} label="Workflow name" value={name} onChange={setName} required />
      <div className="space-y-1.5">
        <label className="block text-sm font-medium text-text-secondary">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-md border border-border bg-bg-elevated px-3 py-2 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <FormInput id={`e-n8n-${workflow.id}`} label="n8n workflow ID" value={n8nId} onChange={setN8nId} />
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Status</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ClientWorkflowStatus)}
            className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none"
          >
            <option value="active">Active</option>
            <option value="inactive">Paused</option>
            <option value="error">Error</option>
          </select>
        </div>
        <FormInput id={`e-t-${workflow.id}`} label="Time saved per run (minutes)" value={timeSaved} onChange={setTimeSaved} type="number" />
        <FormInput id={`e-c-${workflow.id}`} label="Cost saved per run (USD)" value={costSaved} onChange={setCostSaved} type="number" />
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-8 items-center gap-1 rounded-md bg-cyan-500 px-4 text-xs font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
        >
          <Save className="h-3 w-3" />
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border-subtle px-3 text-xs text-text-secondary transition hover:text-text-primary"
        >
          <X className="h-3 w-3" />
          Cancel
        </button>
      </div>
    </form>
  )
}

function FormInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  required?: boolean
  placeholder?: string
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary placeholder:text-text-muted focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />
    </div>
  )
}
