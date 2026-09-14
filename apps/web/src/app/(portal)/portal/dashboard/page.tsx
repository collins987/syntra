import type { Metadata } from "next"
import { StatBar } from "./_components/stat-bar"
import { LiveActivity } from "./_components/live-activity"
import { AutomationNetwork } from "./_components/automation-network"
import { AIAgents } from "./_components/ai-agents"

export const metadata: Metadata = { title: "Dashboard" }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const greeting = getGreeting()

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Top: greeting + stat cards */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-surface px-6 py-5">
        <div className="flex items-start gap-6">
          <div className="w-52 shrink-0">
            <h1 className="text-[28px] font-bold leading-tight text-text-primary">
              {greeting}, Vincent.
            </h1>
            <p className="mt-1.5 text-sm text-text-muted">
              Your autonomous systems are running.
            </p>
          </div>
          <StatBar />
        </div>
      </div>

      {/* Bottom: activity (left) | network + agents (right) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left column: live activity */}
        <div className="flex-1 overflow-hidden border-r border-border-subtle">
          <LiveActivity />
        </div>

        {/* Right column: network stacked above agents */}
        <div className="flex w-[480px] shrink-0 flex-col overflow-y-auto">
          <AutomationNetwork />
          <AIAgents />
        </div>
      </div>
    </div>
  )
}
