import Link from "next/link"
import type { AgentStat } from "@/lib/dashboard"

function timeAgo(iso: string | null) {
  if (!iso) return "No activity"
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function health(agent: AgentStat) {
  if (agent.tasks === 0) return { label: "Idle", cls: "text-text-disabled", dot: "bg-border-strong" }
  if (agent.successRate === null || agent.successRate >= 95)
    return { label: "Optimal", cls: "text-success-400", dot: "bg-success-400" }
  return { label: "Degraded", cls: "text-warning-400", dot: "bg-warning-400" }
}

export function AIAgents({ agents }: { agents: AgentStat[] }) {
  const anyActivity = agents.some((a) => a.tasks > 0)

  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          AI Agents Overview
        </span>
        <Link
          href="/portal/ai-agents"
          className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted"
        >
          Manage
        </Link>
      </div>

      {!anyActivity && (
        <p className="border-b border-border-subtle/60 px-5 py-2.5 text-[11px] text-text-disabled">
          Your agents are provisioned and waiting. Activity appears once your automations start
          calling them.
        </p>
      )}

      <div className="grid grid-cols-3 gap-2.5 p-4">
        {agents.map((agent) => {
          const h = health(agent)
          return (
            <div
              key={agent.id}
              className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3"
            >
              {/* Avatar + name + status */}
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

              {/* Stats */}
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
                    className={[
                      "font-mono text-[12px] font-bold",
                      agent.successRate === null ? "text-text-disabled" : "text-success-400",
                    ].join(" ")}
                  >
                    {agent.successRate === null ? "—" : `${agent.successRate.toFixed(1)}%`}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-text-disabled">Last Active</p>
                  <p className="truncate text-[10px] text-text-muted">
                    {timeAgo(agent.lastActivity)}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
