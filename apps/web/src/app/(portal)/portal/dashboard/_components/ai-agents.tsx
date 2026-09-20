import Link from "next/link"
import type { AgentStat } from "@/lib/dashboard"
import { AgentCard } from "@/components/portal/agent-card"

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

      {/* Single column below sm: at 375px-wide, three cards side by side left
          each with only ~105px — too tight for an avatar, name, role and
          three stat rows. Above sm this panel always has enough width,
          whether it's the full page (below xl) or ~38% of it (xl and up, once
          the dashboard's two-column layout kicks in). */}
      <div className="grid grid-cols-1 gap-2.5 p-4 sm:grid-cols-3">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  )
}
