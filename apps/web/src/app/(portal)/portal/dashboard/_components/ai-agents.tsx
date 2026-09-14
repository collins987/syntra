interface Agent {
  id: string
  initial: string
  name: string
  tasks: string
  recentActivity: string
}

const AGENTS: Agent[] = [
  { id: "ava",     initial: "A", name: "Ava",         tasks: "741 JBM", recentActivity: "Updated SEO, JBM" },
  { id: "max",     initial: "M", name: "Max",         tasks: "741 JBM", recentActivity: "Updated SEO, JBM" },
  { id: "leo",     initial: "L", name: "Leo",         tasks: "741 JBM", recentActivity: "Updated SEO, JBM" },
  { id: "content", initial: "C", name: "Content MIA", tasks: "741 JBM", recentActivity: "Updated SEO, JBM" },
]

export function AIAgents() {
  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          AI Agents Overview
        </span>
        <button className="text-text-disabled hover:text-text-muted transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
            <circle cx="2.5" cy="7" r="1.5" />
            <circle cx="7" cy="7" r="1.5" />
            <circle cx="11.5" cy="7" r="1.5" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 xl:grid-cols-4">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="flex flex-col gap-2 rounded-lg border border-border-subtle bg-bg-elevated p-3"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-[13px] font-bold text-text-secondary">
                {agent.initial}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{agent.name}</p>
                <p className="flex items-center gap-1 text-[11px] text-success-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                  Optimal
                </p>
              </div>
            </div>

            <div className="space-y-1 border-t border-border-subtle pt-2">
              <div>
                <p className="text-[10px] text-text-disabled">Tasks</p>
                <p className="font-mono text-[13px] font-semibold text-text-primary">{agent.tasks}</p>
              </div>
              <div>
                <p className="text-[10px] text-text-disabled">Success Rate</p>
                <p className="font-mono text-[13px] font-semibold text-success-400">99.7%</p>
              </div>
              <div>
                <p className="text-[10px] text-text-disabled">Recent Activity</p>
                <p className="truncate text-[11px] text-text-muted">{agent.recentActivity}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
