"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Clock,
  Plus,
  RefreshCcw,
} from "lucide-react"

import type {
  ClientInvite,
  ClientProject,
  ClientProjectStatus,
  ClientProjectType,
  ClientServiceKey,
  Profile,
  ProfileStatus,
} from "@syntra/db"

interface Props {
  profile: Profile
  services: ClientServiceKey[]
  projects: ClientProject[]
  invite: ClientInvite | null
  last_sign_in_at: string | null
}

const ALL_SERVICES: Array<{ key: ClientServiceKey; label: string }> = [
  { key: "website", label: "Websites" },
  { key: "automations", label: "Automations" },
  { key: "monitoring", label: "Monitoring" },
  { key: "support", label: "Support" },
  { key: "reports", label: "Reports" },
  { key: "billing", label: "Billing" },
  { key: "hermes", label: "Hermes" },
]

const STATUSES: ProfileStatus[] = ["pending", "active", "suspended"]

function formatDateTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function DetailClient({
  profile,
  services,
  projects,
  invite,
  last_sign_in_at,
}: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [companyName, setCompanyName] = useState(profile.company_name ?? "")
  const [status, setStatus] = useState<ProfileStatus>(profile.status)
  const [activeServices, setActiveServices] = useState<Set<ClientServiceKey>>(
    new Set(services),
  )
  const [banner, setBanner] = useState<
    | { kind: "ok"; msg: string }
    | { kind: "err"; msg: string }
    | null
  >(null)
  const [saving, setSaving] = useState(false)
  const [resending, setResending] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)

  function toggleService(key: ClientServiceKey) {
    setActiveServices((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setBanner(null)

    const servicesMap: Record<string, boolean> = {}
    for (const s of ALL_SERVICES) {
      servicesMap[s.key] = activeServices.has(s.key)
    }

    const res = await fetch(`/api/clients/${profile.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
        status,
        services: servicesMap,
      }),
    })
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setSaving(false)
    if (!res.ok || !payload.ok) {
      setBanner({ kind: "err", msg: payload.error ?? "Save failed." })
      return
    }
    setBanner({ kind: "ok", msg: "Saved." })
    router.refresh()
  }

  async function handleResend() {
    setResending(true)
    setBanner(null)
    const res = await fetch(`/api/clients/${profile.id}/resend-invite`, { method: "POST" })
    const payload = (await res.json().catch(() => ({}))) as {
      ok?: boolean
      invite_sent?: boolean
      error?: string
    }
    setResending(false)
    if (!res.ok || !payload.ok) {
      setBanner({ kind: "err", msg: payload.error ?? "Resend failed." })
      return
    }
    setBanner({
      kind: "ok",
      msg: payload.invite_sent
        ? "Fresh invite sent — 30-minute window."
        : "Invite row created, but email send failed.",
    })
    router.refresh()
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link
          href="/admin/clients"
          className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-3 w-3" />
          Back to clients
        </Link>
        <h1 className="mt-2 text-xl font-semibold text-text-primary">
          {profile.full_name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="inline-flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {profile.email}
          </span>
          {profile.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {profile.phone}
            </span>
          )}
          {profile.company_name && (
            <span className="inline-flex items-center gap-1">
              <Building className="h-3 w-3" />
              {profile.company_name}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last sign-in: {formatDateTime(last_sign_in_at)}
          </span>
        </div>
      </div>

      {banner && (
        <div
          className={`mb-5 rounded-md border px-3 py-2 text-sm ${
            banner.kind === "ok"
              ? "border-success-500/20 bg-success-500/10 text-success-400"
              : "border-error-500/20 bg-error-500/10 text-error-400"
          }`}
        >
          {banner.msg}
        </div>
      )}

      {profile.status === "pending" && invite && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-400/20 bg-warning-400/5 p-4">
          <div>
            <p className="text-sm font-medium text-text-primary">
              This client hasn&apos;t activated yet.
            </p>
            <p className="text-xs text-text-muted">
              Invite expires {formatDateTime(invite.expires_at)}. If they&apos;ve
              lost it, send a fresh one.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex h-9 items-center gap-2 rounded-md bg-warning-400/15 px-4 text-sm font-semibold text-warning-400 transition hover:bg-warning-400/25 disabled:opacity-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {resending ? "Sending…" : "Resend invite"}
          </button>
        </div>
      )}

      {profile.status === "pending" && !invite && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning-400/20 bg-warning-400/5 p-4">
          <p className="text-sm text-text-muted">
            No active invite. Send a new one so they can activate their account.
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="flex h-9 items-center gap-2 rounded-md bg-warning-400/15 px-4 text-sm font-semibold text-warning-400 transition hover:bg-warning-400/25 disabled:opacity-50"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            {resending ? "Sending…" : "Send invite"}
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <form
          onSubmit={saveProfile}
          className="space-y-4 rounded-xl border border-border-subtle bg-bg-elevated p-6"
        >
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
            Profile & status
          </h2>

          <Field id="full_name" label="Full name" value={fullName} onChange={setFullName} />
          <Field id="phone" label="Phone" value={phone} onChange={setPhone} />
          <Field id="company_name" label="Company" value={companyName} onChange={setCompanyName} />

          <div className="space-y-1.5">
            <label htmlFor="status" className="block text-sm font-medium text-text-secondary">
              Status
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProfileStatus)}
              className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-text-secondary">Services</p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {ALL_SERVICES.map((opt) => {
                const checked = activeServices.has(opt.key)
                return (
                  <label
                    key={opt.key}
                    className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-cyan-500/40 bg-cyan-500/5 text-text-primary"
                        : "border-border-subtle bg-bg-surface text-text-muted hover:border-border"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleService(opt.key)}
                      className="h-3.5 w-3.5 accent-cyan-500"
                    />
                    {opt.label}
                  </label>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex h-9 items-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
              Projects
            </h2>
            <button
              type="button"
              onClick={() => setShowNewProject((v) => !v)}
              className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-2.5 py-1 text-xs text-text-secondary transition hover:text-text-primary"
            >
              <Plus className="h-3 w-3" />
              {showNewProject ? "Cancel" : "New project"}
            </button>
          </div>

          {showNewProject && (
            <NewProjectForm
              userId={profile.id}
              onCreated={() => {
                setShowNewProject(false)
                router.refresh()
              }}
            />
          )}

          <div className="space-y-2">
            {projects.length === 0 && !showNewProject && (
              <p className="text-xs text-text-disabled">
                No projects yet. Add one to track a build.
              </p>
            )}
            {projects.map((p) => (
              <ProjectRow key={p.id} project={p} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FieldProps {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}

function Field({ id, label, value, onChange }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text-secondary">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
      />
    </div>
  )
}

function NewProjectForm({
  userId,
  onCreated,
}: {
  userId: string
  onCreated: () => void
}) {
  const [name, setName] = useState("")
  const [type, setType] = useState<ClientProjectType>("website")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, name: name.trim(), type }),
    })
    const payload = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
    setLoading(false)
    if (!res.ok || !payload.ok) {
      setError(payload.error ?? "Create failed.")
      return
    }
    onCreated()
  }

  return (
    <form
      onSubmit={submit}
      className="mb-3 space-y-2 rounded-md border border-border-subtle bg-bg-surface p-3"
    >
      <input
        type="text"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
        className="flex h-8 w-full rounded-md border border-border bg-bg-elevated px-2.5 text-sm text-text-primary focus:border-cyan-500 focus:outline-none"
      />
      <select
        value={type}
        onChange={(e) => setType(e.target.value as ClientProjectType)}
        className="flex h-8 w-full rounded-md border border-border bg-bg-elevated px-2.5 text-sm text-text-primary focus:border-cyan-500 focus:outline-none"
      >
        <option value="website">Website</option>
        <option value="automation">Automation</option>
        <option value="both">Both</option>
      </select>
      {error && <p className="text-xs text-error-400">{error}</p>}
      <button
        type="submit"
        disabled={loading || !name.trim()}
        className="flex h-8 w-full items-center justify-center rounded-md bg-cyan-500 text-xs font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {loading ? "Creating…" : "Create project"}
      </button>
    </form>
  )
}

function ProjectRow({ project }: { project: ClientProject }) {
  const router = useRouter()
  const [status, setStatus] = useState<ClientProjectStatus>(project.status)
  const [saving, setSaving] = useState(false)

  async function changeStatus(next: ClientProjectStatus) {
    setStatus(next)
    setSaving(true)
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: next,
        ...(next === "live" ? { mark_deployed: true } : {}),
      }),
    })
    setSaving(false)
    router.refresh()
  }

  return (
    <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-surface px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
        <p className="text-[11px] text-text-disabled">
          {project.type}
          {project.live_url ? ` · ${project.live_url}` : ""}
        </p>
      </div>
      <select
        value={status}
        disabled={saving}
        onChange={(e) => changeStatus(e.target.value as ClientProjectStatus)}
        className="h-7 rounded-md border border-border bg-bg-elevated px-2 text-xs text-text-primary focus:border-cyan-500 focus:outline-none disabled:opacity-50"
      >
        <option value="planning">planning</option>
        <option value="building">building</option>
        <option value="live">live</option>
        <option value="paused">paused</option>
      </select>
    </div>
  )
}
