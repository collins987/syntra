import type { Metadata } from "next"
import Link from "next/link"
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Zap,
  LifeBuoy,
  ExternalLink,
} from "lucide-react"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { createServiceClient } from "@/lib/supabase/service"
import { getUptimeStats } from "@/lib/monitoring/checks"
import type {
  ClientProject,
  ClientWorkflow,
  MonitoringCheckStatus,
  Profile,
  SupportRequest,
} from "@syntra/db"

export const metadata: Metadata = { title: "Admin · System" }

export const dynamic = "force-dynamic"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

type Overall = "operational" | "degraded" | "outage" | "unknown"

const OVERALL_META: Record<
  Overall,
  { label: string; className: string; icon: typeof CheckCircle2 }
> = {
  operational: {
    label: "All systems operational",
    className: "border-success-500/20 bg-success-500/10 text-success-400",
    icon: CheckCircle2,
  },
  degraded: {
    label: "Some systems degraded",
    className: "border-warning-400/20 bg-warning-400/10 text-warning-400",
    icon: AlertTriangle,
  },
  outage: {
    label: "Outage in progress",
    className: "border-error-500/20 bg-error-500/10 text-error-400",
    icon: AlertOctagon,
  },
  unknown: {
    label: "No monitoring data yet",
    className: "border-border-subtle bg-bg-elevated text-text-muted",
    icon: Activity,
  },
}

const STATUS_DOT: Record<MonitoringCheckStatus, string> = {
  up: "bg-success-400",
  degraded: "bg-warning-400",
  down: "bg-error-400",
}

const STATUS_LABEL: Record<MonitoringCheckStatus, string> = {
  up: "Up",
  degraded: "Degraded",
  down: "Down",
}

function uptimeTone(pct: number): string {
  if (pct >= 99.9) return "text-success-400"
  if (pct >= 99) return "text-success-400/80"
  if (pct >= 95) return "text-warning-400"
  return "text-error-400"
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never"
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default async function AdminSystemPage() {
  await requirePlatformAdmin()

  const db = createServiceClient() as AnyDb

  const [projectsRes, profilesRes, workflowsRes, supportRes] = (await Promise.all([
    db
      .from("client_projects")
      .select("*")
      .order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, email"),
    db.from("client_workflows").select("status"),
    db.from("support_requests").select("status, resolved_at"),
  ])) as [
    { data: ClientProject[] | null },
    { data: Pick<Profile, "id" | "full_name" | "email">[] | null },
    { data: Pick<ClientWorkflow, "status">[] | null },
    { data: Pick<SupportRequest, "status" | "resolved_at">[] | null },
  ]

  const projects = projectsRes.data ?? []
  const profiles = profilesRes.data ?? []
  const workflows = workflowsRes.data ?? []
  const support = supportRes.data ?? []

  const profileById = new Map(profiles.map((p) => [p.id, p]))

  const projectRows = await Promise.all(
    projects.map(async (project) => {
      const stats = await getUptimeStats(project.id)
      const owner = profileById.get(project.user_id)
      return {
        project,
        owner_full_name: owner?.full_name ?? "Unknown",
        owner_email: owner?.email ?? "",
        uptime_pct: stats.uptime_pct,
        latest_status: stats.latest?.status ?? null,
        latest_checked_at: stats.latest?.checked_at ?? null,
        total_checks: stats.total,
      }
    }),
  )

  const latestStatuses = projectRows
    .map((r) => r.latest_status)
    .filter(Boolean) as MonitoringCheckStatus[]
  const overall: Overall =
    latestStatuses.length === 0
      ? "unknown"
      : latestStatuses.some((s) => s === "down")
        ? "outage"
        : latestStatuses.some((s) => s === "degraded")
          ? "degraded"
          : "operational"

  const workflowCounts = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === "active").length,
    inactive: workflows.filter((w) => w.status === "inactive").length,
    error: workflows.filter((w) => w.status === "error").length,
  }

  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const supportCounts = {
    open: support.filter((s) => s.status === "open").length,
    in_progress: support.filter((s) => s.status === "in_progress").length,
    resolved_last_7d: support.filter(
      (s) =>
        s.status === "resolved" &&
        s.resolved_at !== null &&
        new Date(s.resolved_at).getTime() >= sevenDaysAgo,
    ).length,
  }

  const overallMeta = OVERALL_META[overall]
  const OverallIcon = overallMeta.icon

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">System</h1>
          <p className="mt-1 text-sm text-text-muted">
            Platform-wide view: client project uptime, workflow catalogue health, and support queue.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${overallMeta.className}`}
        >
          <OverallIcon className="h-3.5 w-3.5" />
          {overallMeta.label}
        </span>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatTile
          icon={Activity}
          label="Projects monitored"
          value={String(
            projectRows.filter((r) => r.project.live_url && r.total_checks > 0).length,
          )}
          hint={`${projectRows.length} total`}
        />
        <StatTile
          icon={Zap}
          label="Workflows"
          value={`${workflowCounts.active} active`}
          hint={
            workflowCounts.error > 0
              ? `${workflowCounts.error} error`
              : `${workflowCounts.inactive} paused · ${workflowCounts.total} total`
          }
          hintTone={workflowCounts.error > 0 ? "error" : "default"}
          href="/admin/workflows"
        />
        <StatTile
          icon={LifeBuoy}
          label="Support queue"
          value={`${supportCounts.open + supportCounts.in_progress} open`}
          hint={`${supportCounts.resolved_last_7d} resolved last 7d`}
          href="/admin/support"
        />
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Project uptime</h2>
          <p className="text-[11px] text-text-disabled">
            Across all personal-account clients
          </p>
        </div>
        {projectRows.length === 0 ? (
          <div className="py-10 text-center text-sm text-text-disabled">
            No client projects yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  {[
                    "Project",
                    "Owner",
                    "Live URL",
                    "Status",
                    "Uptime (30d)",
                    "Last check",
                  ].map((h) => (
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
                {projectRows.map((row) => {
                  const hasHistory = row.total_checks > 0
                  return (
                    <tr key={row.project.id} className="hover:bg-white/[0.02] transition">
                      <td className="px-6 py-3.5">
                        <Link
                          href={`/admin/clients/${row.project.user_id}`}
                          className="font-medium text-text-primary hover:text-cyan-400"
                        >
                          {row.project.name}
                        </Link>
                        <p className="text-[11px] text-text-disabled">
                          {row.project.type}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        <p className="text-xs text-text-primary">
                          {row.owner_full_name}
                        </p>
                        <p className="text-[11px] text-text-disabled">
                          {row.owner_email}
                        </p>
                      </td>
                      <td className="px-6 py-3.5">
                        {row.project.live_url ? (
                          <a
                            href={row.project.live_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                          >
                            {row.project.live_url.replace(/^https?:\/\//, "").slice(0, 32)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-xs text-text-disabled">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {row.latest_status ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                STATUS_DOT[row.latest_status]
                              }`}
                            />
                            {STATUS_LABEL[row.latest_status]}
                          </span>
                        ) : (
                          <span className="text-xs text-text-disabled">No data</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        {hasHistory ? (
                          <span className={`text-xs font-semibold ${uptimeTone(row.uptime_pct)}`}>
                            {row.uptime_pct}%
                          </span>
                        ) : (
                          <span className="text-xs text-text-disabled">—</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-xs text-text-disabled">
                        {timeAgo(row.latest_checked_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatTile({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "default",
  href,
}: {
  icon: typeof Activity
  label: string
  value: string
  hint: string
  hintTone?: "default" | "error"
  href?: string
}) {
  const body = (
    <>
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10.5px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      <p
        className={`mt-1 text-[11px] ${
          hintTone === "error" ? "text-error-400" : "text-text-disabled"
        }`}
      >
        {hint}
      </p>
    </>
  )

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-xl border border-border-subtle bg-bg-elevated p-4 transition hover:border-cyan-500/30 hover:bg-bg-overlay/40"
      >
        {body}
      </Link>
    )
  }
  return <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4">{body}</div>
}
