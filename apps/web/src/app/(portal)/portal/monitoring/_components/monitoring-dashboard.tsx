import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  ExternalLink,
  Clock,
} from "lucide-react"

import type {
  ClientProject,
  MonitoringCheck,
  MonitoringCheckStatus,
} from "@syntra/db"

export interface MonitoringProjectSummary {
  project: ClientProject
  uptime_pct: number
  latest_status: MonitoringCheckStatus | null
  latest_checked_at: string | null
  avg_response_time_ms: number | null
  recent: MonitoringCheck[]
}

interface Props {
  overall: "operational" | "degraded" | "outage" | "unknown"
  projects: MonitoringProjectSummary[]
}

const OVERALL_META: Record<
  Props["overall"],
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
    label: "No data yet",
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

function timeAgo(iso: string | null): string {
  if (!iso) return "Never"
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

function uptimeBadgeTone(pct: number): string {
  if (pct >= 99.9) return "text-success-400"
  if (pct >= 99) return "text-success-400/80"
  if (pct >= 95) return "text-warning-400"
  return "text-error-400"
}

export function MonitoringDashboard({ overall, projects }: Props) {
  const overallMeta = OVERALL_META[overall]
  const OverallIcon = overallMeta.icon

  return (
    <div className="p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Monitoring</h1>
          <p className="mt-1 text-sm text-text-muted">
            Uptime and recent activity across every system we run for you.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-medium ${overallMeta.className}`}
        >
          <OverallIcon className="h-3.5 w-3.5" />
          {overallMeta.label}
        </span>
      </div>

      {projects.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {projects.map((p) => (
            <ProjectCard key={p.project.id} summary={p} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
        <Activity className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-text-primary">
        No projects to monitor yet.
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Once a site goes live, we start checking it every few minutes and surface the result here.
      </p>
    </div>
  )
}

function ProjectCard({ summary }: { summary: MonitoringProjectSummary }) {
  const { project, uptime_pct, latest_status, latest_checked_at, avg_response_time_ms, recent } =
    summary

  const hasHistory = recent.length > 0
  const hasLive = Boolean(project.live_url)

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">
            {project.name}
          </p>
          {project.live_url ? (
            <a
              href={project.live_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:text-cyan-300"
            >
              {project.live_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <p className="mt-0.5 text-[11px] text-text-disabled">No live URL set</p>
          )}
        </div>
        {latest_status && (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-surface px-2 py-0.5 text-[11px] font-medium text-text-secondary">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[latest_status]}`} />
            {STATUS_LABEL[latest_status]}
          </span>
        )}
      </div>

      <div className="mb-3 grid grid-cols-3 gap-3 border-y border-border-subtle py-3">
        <Stat
          label="Uptime (30d)"
          value={hasHistory ? `${uptime_pct}%` : "—"}
          tone={hasHistory ? uptimeBadgeTone(uptime_pct) : "text-text-disabled"}
        />
        <Stat
          label="Last check"
          value={timeAgo(latest_checked_at)}
          icon={<Clock className="h-3 w-3" />}
          tone="text-text-primary"
        />
        <Stat
          label="Avg response"
          value={
            avg_response_time_ms === null ? "—" : `${avg_response_time_ms} ms`
          }
          tone="text-text-primary"
        />
      </div>

      <div>
        <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-text-disabled">
          Recent checks
        </p>
        {!hasLive ? (
          <p className="text-[11px] text-text-disabled">
            Add a live URL to this project (from the admin panel) and monitoring will start.
          </p>
        ) : !hasHistory ? (
          <p className="text-[11px] text-text-disabled">
            The first check will land within the next tick (every 5 minutes).
          </p>
        ) : (
          <div className="flex items-end gap-0.5">
            {[...recent].reverse().map((c) => (
              <span
                key={c.id}
                title={`${STATUS_LABEL[c.status]} · ${new Date(c.checked_at).toLocaleString()}`}
                className={`h-6 w-1.5 rounded-sm ${STATUS_DOT[c.status]}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  icon,
  tone,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  tone: string
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p className={`mt-0.5 inline-flex items-center gap-1 text-sm font-semibold ${tone}`}>
        {icon}
        {value}
      </p>
    </div>
  )
}
