import type { Metadata } from "next"
import Link from "next/link"
import { UserPlus, Clock, CheckCircle2, PauseCircle } from "lucide-react"

import { createServiceClient } from "@/lib/supabase/service"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { listClients } from "@/lib/admin/clients"
import type { ProfileStatus } from "@syntra/db"

export const metadata: Metadata = { title: "Clients" }

const PLAN_LABELS: Record<string, string> = {
  sites: "Sites",
  flow: "Flow",
  ai: "AI",
  os: "OS",
}

const STATUS_META: Record<
  ProfileStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Pending invite",
    className: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  },
  active: {
    label: "Active",
    className: "border-success-500/20 bg-success-500/10 text-success-400",
  },
  suspended: {
    label: "Suspended",
    className: "border-error-500/20 bg-error-500/10 text-error-400",
  },
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

export default async function AdminClientsPage() {
  await requirePlatformAdmin()

  const [clients, orgsRes] = await Promise.all([
    listClients(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (createServiceClient() as any)
      .from("organizations")
      .select("id, name, slug, plan, created_at")
      .order("created_at", { ascending: false }) as Promise<{
      data: Array<{
        id: string
        name: string
        slug: string
        plan: string
        created_at: string
      }> | null
    }>,
  ])

  const orgs = orgsRes.data ?? []

  const active = clients.filter((c) => c.status === "active").length
  const pending = clients.filter((c) => c.status === "pending").length
  const suspended = clients.filter((c) => c.status === "suspended").length

  return (
    <div className="p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Clients</h1>
          <p className="mt-1 text-sm text-text-muted">
            {clients.length} personal-account client{clients.length === 1 ? "" : "s"} ·{" "}
            {active} active · {pending} pending · {suspended} suspended
          </p>
        </div>
        <Link
          href="/admin/onboarding"
          className="flex h-9 items-center gap-2 rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm transition hover:bg-cyan-400"
        >
          <UserPlus className="h-4 w-4" />
          New client
        </Link>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Name", "Status", "Services", "Last sign-in", "Created"].map((h) => (
                  <th
                    key={h}
                    className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {clients.map((c) => {
                const meta = STATUS_META[c.status]
                const statusIcon =
                  c.status === "active" ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : c.status === "suspended" ? (
                    <PauseCircle className="h-3 w-3" />
                  ) : (
                    <Clock className="h-3 w-3" />
                  )
                return (
                  <tr key={c.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-6 py-3.5">
                      <Link
                        href={`/admin/clients/${c.id}`}
                        className="font-medium text-text-primary hover:text-cyan-400"
                      >
                        {c.full_name}
                      </Link>
                      <p className="text-xs text-text-disabled">{c.email}</p>
                      {c.company_name && (
                        <p className="text-[11px] text-text-disabled">
                          {c.company_name}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${meta.className}`}
                      >
                        {statusIcon}
                        {meta.label}
                      </span>
                      {c.pending_invite && c.status === "pending" && (
                        <p className="mt-1 text-[10.5px] text-warning-400">
                          Invite active
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      {c.services.length === 0 ? (
                        <span className="text-xs text-text-disabled">None</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {c.services.map((s) => (
                            <span
                              key={s}
                              className="rounded border border-border-subtle bg-bg-surface px-1.5 py-0.5 text-[10.5px] text-text-secondary"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text-disabled">
                      {formatDate(c.last_sign_in_at)}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text-disabled">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {clients.length === 0 && (
            <div className="py-14 text-center text-sm text-text-disabled">
              No personal-account clients yet.{" "}
              <Link href="/admin/onboarding" className="text-cyan-400 hover:text-cyan-300">
                Create one
              </Link>
              .
            </div>
          )}
        </div>
      </div>

      {orgs.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-text-muted">
            Legacy organizations
          </h2>
          <p className="mt-1 text-xs text-text-disabled">
            Pre-Phase 1 clients still on the org model. Preserved, not actively onboarded.
          </p>
          <div className="mt-3 rounded-xl border border-border-subtle bg-bg-elevated">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {["Organization", "Plan", "Joined"].map((h) => (
                    <th
                      key={h}
                      className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {orgs.map((org) => (
                  <tr key={org.id}>
                    <td className="px-6 py-3">
                      <p className="font-medium text-text-primary">{org.name}</p>
                      <p className="text-xs text-text-disabled">{org.slug}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-400">
                        {PLAN_LABELS[org.plan] ?? org.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-text-disabled">
                      {formatDate(org.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
