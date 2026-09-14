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
    <div className="flex h-full flex-col overflow-hidden bg-bg-base">
      {/* ── Top: greeting + stat cards ── */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-surface px-8 py-6">
        <div className="flex items-start gap-8">
          {/* Greeting */}
          <div className="w-[220px] shrink-0">
            <h1 className="text-[38px] font-bold leading-[1.15] tracking-tight text-text-primary">
              {greeting},<br />Vincent.
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              Your autonomous systems are running.
            </p>
          </div>

          {/* Stat cards */}
          <div className="flex-1 min-w-0">
            <StatBar />
          </div>
        </div>
      </div>

      {/* ── Bottom: activity (left) | network + agents (right) ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Activity — takes remaining space */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border-subtle">
          <LiveActivity />
        </div>

        {/* Right panel — proportional, scrollable vertically */}
        <div className="flex w-[48%] min-w-[450px] shrink-0 flex-col overflow-y-auto">
          <AutomationNetwork />
          <AIAgents />
        </div>
      </div>
    </div>
  )
}
