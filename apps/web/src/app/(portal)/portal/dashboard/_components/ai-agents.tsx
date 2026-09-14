"use client"

import { AreaChart, Area, ResponsiveContainer } from "recharts"

const agentActivity = [
  { v: 4 }, { v: 7 }, { v: 5 }, { v: 9 }, { v: 6 },
  { v: 10 }, { v: 8 }, { v: 12 }, { v: 9 }, { v: 14 },
]

function AgentSpark({ id }: { id: string }) {
  return (
    <ResponsiveContainer width="100%" height={24}>
      <AreaChart data={agentActivity} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#10B981"
          strokeWidth={1.2}
          fill={`url(#${id})`}
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

interface Agent {
  id: string
  initial: string
  name: string
  tasks: string
  successRate: string
  recentActivity: string
}

const AGENTS: Agent[] = [
  { id: "ava",     initial: "A", name: "Ava",         tasks: "741 JBM", successRate: "99.7%", recentActivity: "Updated SEO, JBM" },
  { id: "max",     initial: "M", name: "Max",         tasks: "741 JBM", successRate: "99.4%", recentActivity: "Updated SEO, JBM" },
  { id: "leo",     initial: "L", name: "Leo",         tasks: "741 JBM", successRate: "98.9%", recentActivity: "Updated SEO, JBM" },
  { id: "content", initial: "C", name: "Content MIA", tasks: "741 JBM", successRate: "99.1%", recentActivity: "Updated SEO, JBM" },
]

export function AIAgents() {
  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          AI Agents Overview
        </span>
        <button className="text-text-disabled transition-colors hover:text-text-muted">
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
            className="flex flex-col gap-2.5 rounded-xl border border-border-subtle bg-bg-elevated p-3"
          >
            {/* Avatar + name row */}
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-[14px] font-bold text-text-secondary">
                {agent.initial}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-[13px] font-semibold text-text-primary"
                  title={agent.name}
                >
                  {agent.name}
                </p>
                <p className="flex items-center gap-1 text-[11px] text-success-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-success-400" />
                  Optimal
                </p>
              </div>
            </div>

            {/* Mini activity chart */}
            <AgentSpark id={`agent-spark-${agent.id}`} />

            {/* Stats */}
            <div className="grid grid-cols-2 gap-1.5 border-t border-border-subtle pt-2">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-text-disabled">Tasks</p>
                <p className="mt-0.5 font-mono text-[12px] font-semibold text-text-primary">
                  {agent.tasks}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-text-disabled">Success</p>
                <p className="mt-0.5 font-mono text-[12px] font-semibold text-success-400">
                  {agent.successRate}
                </p>
              </div>
            </div>

            <div>
              <p className="text-[9px] uppercase tracking-wider text-text-disabled">
                Recent Activity
              </p>
              <p
                className="mt-0.5 truncate text-[11px] text-text-muted"
                title={agent.recentActivity}
              >
                {agent.recentActivity}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
