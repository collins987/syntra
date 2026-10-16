import {
  Zap,
  Play,
  Pause,
  AlertCircle,
  Clock,
  Timer,
  DollarSign,
} from "lucide-react"

import type { AssignedClientWorkflow } from "@syntra/db"

interface Props {
  workflows: AssignedClientWorkflow[]
  totalTimeSavedMinutes: number
  totalCostSavedUsd: number
  activeCount: number
  errorCount: number
}

const STATUS_META: Record<
  AssignedClientWorkflow["status"],
  { label: string; icon: typeof Play; className: string; dot: string }
> = {
  active: {
    label: "Active",
    icon: Play,
    className: "border-success-500/20 bg-success-500/10 text-success-400",
    dot: "bg-success-400",
  },
  inactive: {
    label: "Paused",
    icon: Pause,
    className: "border-border-subtle bg-bg-surface text-text-muted",
    dot: "bg-border-strong",
  },
  error: {
    label: "Error",
    icon: AlertCircle,
    className: "border-error-500/20 bg-error-500/10 text-error-400",
    dot: "bg-error-400",
  },
}

function formatHours(minutes: number): string {
  if (minutes === 0) return "0h"
  if (minutes < 60) return `${minutes}m`
  const hours = minutes / 60
  if (hours < 10) return `${hours.toFixed(1)}h`
  return `${Math.round(hours)}h`
}

function formatMoney(usd: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: usd >= 100 ? 0 : 2,
  }).format(usd)
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never run"
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60_000)
  if (minutes < 1) return "Just now"
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

export function AutomationsGrid({
  workflows,
  totalTimeSavedMinutes,
  totalCostSavedUsd,
  activeCount,
  errorCount,
}: Props) {
  if (workflows.length === 0) {
    return (
      <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
          <Zap className="h-5 w-5" />
        </span>
        <p className="mt-3 text-sm font-medium text-text-primary">
          No automations assigned yet.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Once we start running workflows for you, they&apos;ll show up here with the time and money they save.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SummaryTile
          icon={Timer}
          label="Total time saved"
          value={formatHours(totalTimeSavedMinutes)}
          hint={totalTimeSavedMinutes > 0 ? "Per run, across your workflows" : ""}
        />
        <SummaryTile
          icon={DollarSign}
          label="Total cost saved"
          value={formatMoney(totalCostSavedUsd)}
          hint={totalCostSavedUsd > 0 ? "Per run, across your workflows" : ""}
        />
        <SummaryTile
          icon={Zap}
          label="Automations"
          value={`${activeCount} active`}
          hint={
            errorCount > 0
              ? `${errorCount} needing attention`
              : workflows.length === activeCount
                ? "All running"
                : `${workflows.length - activeCount} paused`
          }
          hintTone={errorCount > 0 ? "error" : "default"}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {workflows.map((w) => (
          <WorkflowCard key={w.id} workflow={w} />
        ))}
      </div>
    </>
  )
}

function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  hintTone = "default",
}: {
  icon: typeof Timer
  label: string
  value: string
  hint: string
  hintTone?: "default" | "error"
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-4">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10.5px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-text-primary">{value}</p>
      {hint && (
        <p
          className={`mt-1 text-[11px] ${
            hintTone === "error" ? "text-error-400" : "text-text-disabled"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

function WorkflowCard({ workflow }: { workflow: AssignedClientWorkflow }) {
  const meta = STATUS_META[workflow.status]
  const StatusIcon = meta.icon

  return (
    <div className="flex flex-col rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
            <Zap className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-text-primary">
              {workflow.name}
            </p>
            {workflow.description && (
              <p className="mt-0.5 line-clamp-2 text-[11.5px] text-text-muted">
                {workflow.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10.5px] font-medium ${meta.className}`}
        >
          <StatusIcon className="h-3 w-3" />
          {meta.label}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] text-text-disabled">
          <Clock className="h-3 w-3" />
          {timeAgo(workflow.last_run_at)}
        </span>
      </div>

      <div className="mt-auto grid grid-cols-2 gap-3 border-t border-border-subtle pt-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
            Time saved
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {formatHours(workflow.time_saved_minutes)}
          </p>
          <p className="text-[10px] text-text-disabled">per run</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
            Cost saved
          </p>
          <p className="mt-0.5 text-sm font-semibold text-text-primary">
            {formatMoney(workflow.cost_saved_usd)}
          </p>
          <p className="text-[10px] text-text-disabled">per run</p>
        </div>
      </div>
    </div>
  )
}
