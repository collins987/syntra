import type { Metadata } from "next"
import { Zap, Play, Pause, AlertCircle, FileEdit } from "lucide-react"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { getManagedAutomations, type ManagedAutomation } from "@/lib/automation-manager"
import {
  PageShell, PageHeader, PageBody, KpiCard, Panel, EmptyState, StatusBadge, timeAgo, NoOrg,
  type StatusTone,
} from "@/components/portal/primitives"
import { SyncButton } from "./_components/sync-button"

export const metadata: Metadata = { title: "Automations" }

const STATUS_META: Record<string, { label: string; tone: StatusTone; icon: typeof Zap; dot: string }> = {
  active: {
    label: "Active",
    tone: "cyan",
    icon: Play,
    dot: "bg-cyan-400",
  },
  paused: { label: "Paused", tone: "neutral", icon: Pause, dot: "bg-border-strong" },
  error: { label: "Error", tone: "error", icon: AlertCircle, dot: "bg-error-400" },
  draft: { label: "Draft", tone: "warning", icon: FileEdit, dot: "bg-warning-400/60" },
}

function duration(ms: number | null): string {
  if (ms == null) return "—"
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export default async function AutomationsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Automations" />

  const { automations, summary } = await getManagedAutomations(org.org_id)

  return (
    <PageShell>
      <PageHeader
        title="Automations"
        subtitle={
          summary.total === 0
            ? "Nothing running yet"
            : `${summary.total} workflow${summary.total === 1 ? "" : "s"} · ${summary.active} active`
        }
        actions={isOrgAdmin(org.role) ? <SyncButton /> : undefined}
      />
      <PageBody>
        {automations.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No automations yet"
            body="Once SYNTRA builds your first workflow it appears here, with its run history and health. You never need to open the automation engine yourself."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard label="Workflows" value={summary.total} hint={`${summary.active} active`} />
              <KpiCard
                label="Runs this month"
                value={summary.executionsThisMonth.toLocaleString()}
                hint="Across all workflows"
              />
              <KpiCard
                label="Success rate"
                value={summary.overallSuccessRate === null ? "—" : `${summary.overallSuccessRate}%`}
                hint="Of finished runs"
                tone={
                  summary.overallSuccessRate === null
                    ? "default"
                    : summary.overallSuccessRate >= 95
                      ? "success"
                      : summary.overallSuccessRate >= 80
                        ? "warning"
                        : "error"
                }
              />
              <KpiCard
                label="Need attention"
                value={summary.needingAttention}
                hint={summary.needingAttention === 0 ? "Everything healthy" : "Failed on last run"}
                tone={summary.needingAttention > 0 ? "error" : "success"}
              />
            </div>

            {summary.needingAttention > 0 && (
              <Panel title="Needs attention" description="These failed on their most recent run.">
                <div className="divide-y divide-border-subtle/50">
                  {automations.filter((a) => a.needsAttention).map((a) => (
                    <AutomationRow key={a.id} automation={a} showError />
                  ))}
                </div>
              </Panel>
            )}

            <Panel title="All automations">
              <div className="divide-y divide-border-subtle/50">
                {automations.map((a) => (
                  <AutomationRow key={a.id} automation={a} />
                ))}
              </div>
            </Panel>
          </div>
        )}
      </PageBody>
    </PageShell>
  )
}

function AutomationRow({
  automation: a,
  showError = false,
}: {
  automation: ManagedAutomation
  showError?: boolean
}) {
  const meta = STATUS_META[a.needsAttention ? "error" : a.status] ?? STATUS_META["draft"]!
  const Icon = meta.icon

  return (
    <div className="px-6 py-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
          <Icon className="h-4 w-4 text-text-muted" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-text-primary">{a.name}</p>
          <p className="mt-0.5 font-mono text-[11px] text-text-disabled">
            {a.workflowCode ?? "—"}
          </p>
        </div>

        <div className="hidden w-24 shrink-0 text-right sm:block">
          <p className="text-xs text-text-muted">This month</p>
          <p className="font-mono text-[11px] tabular-nums text-text-disabled">
            {a.monthlyExecutions} run{a.monthlyExecutions === 1 ? "" : "s"}
          </p>
        </div>

        <div className="hidden w-20 shrink-0 text-right md:block">
          <p className="text-xs text-text-muted">Success</p>
          <p className="font-mono text-[11px] tabular-nums text-text-disabled">
            {a.successRate === null ? "—" : `${a.successRate}%`}
          </p>
        </div>

        <div className="hidden w-20 shrink-0 text-right lg:block">
          <p className="text-xs text-text-muted">Avg time</p>
          <p className="font-mono text-[11px] tabular-nums text-text-disabled">
            {duration(a.avgDurationMs)}
          </p>
        </div>

        <div className="hidden w-24 shrink-0 text-right md:block">
          <p className="text-xs text-text-muted">Last run</p>
          <p className="font-mono text-[11px] text-text-disabled">{timeAgo(a.lastRunAt)}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
          <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
        </div>
      </div>

      {showError && a.lastError && (
        <div className="mt-3 ml-13 rounded-lg border border-error-500/20 bg-error-500/5 px-4 py-2.5">
          <p className="font-mono text-[11px] leading-relaxed text-error-400">{a.lastError}</p>
          <p className="mt-1 text-[11px] text-text-disabled">
            Failed {timeAgo(a.lastErrorAt)} · ask Max in the AI Center to explain this
          </p>
        </div>
      )}
    </div>
  )
}
