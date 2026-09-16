import type { Metadata } from "next"
import type { Automation } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Zap, Play, Pause, AlertCircle, FileEdit } from "lucide-react"
import { SyncButton } from "./_components/sync-button"

export const metadata: Metadata = { title: "Automations" }

type AutomationStatus = "active" | "paused" | "error" | "draft"

const STATUS_CONFIG: Record<AutomationStatus, { label: string; dot: string; badge: string }> = {
  active: {
    label: "Active",
    dot: "bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(0,229,255,0.7)]",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  paused: {
    label: "Paused",
    dot: "bg-border-strong",
    badge: "bg-border-strong/30 text-text-muted border-border-subtle",
  },
  error: {
    label: "Error",
    dot: "bg-error-400",
    badge: "bg-error-500/10 text-error-400 border-error-500/20",
  },
  draft: {
    label: "Draft",
    dot: "bg-warning-400/60",
    badge: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  },
}

const STATUS_ICON: Record<AutomationStatus, typeof Zap> = {
  active: Play,
  paused: Pause,
  error: AlertCircle,
  draft: FileEdit,
}

function timeAgo(iso: string | null) {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default async function AutomationsPage() {
  const org = await getUserOrg()
  const supabase = await createClient()

  let automations: Automation[] = []
  if (org) {
    const { data } = await supabase
      .from("automations")
      .select("*")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: false })
    automations = data ?? []
  }

  const counts = {
    total: automations.length,
    active: automations.filter((a) => a.status === "active").length,
    error: automations.filter((a) => a.status === "error").length,
  }

  return (
    <div className="animate-fade-in flex h-full flex-col">
      {/* Header */}
      <div className="shrink-0 border-b border-border-subtle px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Automations</h1>
            <p className="mt-1 text-sm text-text-muted">
              {counts.total} workflows · {counts.active} active
              {counts.error > 0 && (
                <span className="ml-2 text-error-400">{counts.error} error</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <SyncButton />
            <button className="flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors">
              <Zap className="h-3.5 w-3.5" />
              New automation
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {automations.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-elevated">
            <div className="divide-y divide-border-subtle/50">
              {automations.map((auto) => {
                const status = (auto.status as AutomationStatus) ?? "draft"
                const cfg = STATUS_CONFIG[status]
                const Icon = STATUS_ICON[status]
                return (
                  <div
                    key={auto.id}
                    className="flex items-center gap-5 px-6 py-4 transition-colors hover:bg-bg-surface/60"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
                      <Icon className="h-4 w-4 text-text-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">{auto.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-text-disabled">
                        {auto.workflow_code}
                        {auto.n8n_workflow_id && ` · n8n:${auto.n8n_workflow_id}`}
                      </p>
                    </div>
                    <div className="hidden w-28 shrink-0 text-right md:block">
                      <p className="text-xs text-text-muted">Last run</p>
                      <p className="font-mono text-[11px] text-text-disabled">{timeAgo(auto.last_run_at)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
        <Zap className="h-6 w-6 text-text-disabled" />
      </div>
      <p className="text-base font-semibold text-text-primary">No automations yet</p>
      <p className="mt-1 text-sm text-text-muted">Create your first workflow to start automating.</p>
      <button className="mt-6 flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors">
        <Zap className="h-3.5 w-3.5" />
        Create first automation
      </button>
    </div>
  )
}
