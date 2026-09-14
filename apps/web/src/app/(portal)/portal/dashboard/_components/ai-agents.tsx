const AGENTS = [
  { id: "ava",     initial: "A", name: "Ava",         tasks: "741 JBM", successRate: "99.7%", activity: "Updated SEO, JBM" },
  { id: "max",     initial: "M", name: "Max",         tasks: "741 JBM", successRate: "99.4%", activity: "Updated SEO, JBM" },
  { id: "leo",     initial: "L", name: "Leo",         tasks: "741 JBM", successRate: "98.9%", activity: "Updated SEO, JBM" },
  { id: "content", initial: "C", name: "Content MIA", tasks: "741 JBM", successRate: "99.1%", activity: "Updated SEO, JBM" },
]

export function AIAgents() {
  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          AI Agents Overview
        </span>
        <button className="flex h-6 w-6 items-center justify-center rounded text-text-disabled transition-colors hover:bg-bg-overlay hover:text-text-muted">
          <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
            <circle cx="1.5" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12.5" cy="2" r="1.5" />
          </svg>
        </button>
      </div>

      {/* 4-column agent cards */}
      <div className="grid grid-cols-4 gap-2.5 p-4">
        {AGENTS.map((agent) => (
          <div
            key={agent.id}
            className="flex flex-col gap-3 rounded-xl border border-border-subtle bg-bg-elevated p-3"
          >
            {/* Avatar + name + status */}
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-[14px] font-bold text-text-secondary">
                {agent.initial}
              </div>
              <div>
                <p className="truncate text-[12px] font-semibold text-text-primary" title={agent.name}>
                  {agent.name}
                </p>
                <p className="flex items-center gap-1 text-[10px] text-success-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                  Optimal
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-1.5 border-t border-border-subtle/60 pt-2">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-text-disabled">Tasks</p>
                <p className="font-mono text-[12px] font-bold text-text-primary">{agent.tasks}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-text-disabled">Success Rate</p>
                <p className="font-mono text-[12px] font-bold text-success-400">{agent.successRate}</p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-text-disabled">Recent Activity</p>
                <p className="truncate text-[10px] text-text-muted" title={agent.activity}>
                  {agent.activity}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
