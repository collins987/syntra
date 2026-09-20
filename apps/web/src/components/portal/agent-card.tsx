// The compact agent tile used in overview contexts (the dashboard's AI
// Agents panel). The full settings page (/portal/ai-agents) is a different,
// form-heavy shape — autonomy sliders, tool grants — and stays on Panel +
// StatusBadge rather than being forced into this tile.

function timeAgo(iso: string | null): string {
  if (!iso) return "No activity"
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export interface AgentCardData {
  id: string
  initial: string
  name: string
  role: string
  tasks: number
  successRate: number | null
  lastActivity: string | null
}

function health(agent: AgentCardData) {
  if (agent.tasks === 0) return { label: "Idle", cls: "text-text-disabled", dot: "bg-border-strong" }
  if (agent.successRate === null || agent.successRate >= 95)
    return { label: "Optimal", cls: "text-success-400", dot: "bg-success-400" }
  return { label: "Degraded", cls: "text-warning-400", dot: "bg-warning-400" }
}

export function AgentCard({ agent }: { agent: AgentCardData }) {
  const h = health(agent)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3">
      <div className="flex flex-col items-start gap-1.5">
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-[14px] font-bold text-text-secondary">
          {agent.initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-text-primary" title={agent.name}>
            {agent.name}
          </p>
          <p className="truncate text-[10px] text-text-disabled" title={agent.role}>
            {agent.role}
          </p>
          <p className={`mt-0.5 flex items-center gap-1 text-[10px] ${h.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${h.dot}`} />
            {h.label}
          </p>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-border-subtle/60 pt-2">
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-disabled">Tasks</p>
          <p className="font-mono text-[12px] font-bold text-text-primary">
            {agent.tasks.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-disabled">Success Rate</p>
          <p
            className={`font-mono text-[12px] font-bold ${
              agent.successRate === null ? "text-text-disabled" : "text-success-400"
            }`}
          >
            {agent.successRate === null ? "—" : `${agent.successRate.toFixed(1)}%`}
          </p>
        </div>
        <div>
          <p className="text-[9px] uppercase tracking-wider text-text-disabled">Last Active</p>
          <p className="truncate text-[10px] text-text-muted">{timeAgo(agent.lastActivity)}</p>
        </div>
      </div>
    </div>
  )
}
