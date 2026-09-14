import type { Metadata } from "next"
import { AutomationNetwork } from "./_components/automation-network"
import { MetricCard } from "@syntra/ui"
import { ActivityFeed } from "@syntra/ui"
import type { ActivityItem } from "@syntra/ui"

export const metadata: Metadata = { title: "Dashboard" }

const metrics = [
  { label: "Active Automations", value: 24, trend: 12.4, trendLabel: "this month", accent: true },
  { label: "System Uptime", value: "98.7", suffix: "%", trend: 0.2, trendLabel: "vs last month" },
  { label: "AI Tasks Completed", value: "1,284", trend: 34.1, trendLabel: "this month" },
  { label: "Leads Generated", value: 47, trend: 18.6, trendLabel: "this month" },
  { label: "Revenue", value: "12,840", prefix: "$", trend: 22.3, trendLabel: "this month" },
  { label: "Success Rate", value: "97.8", suffix: "%", trend: 1.1, trendLabel: "vs last month" },
]

const activity: ActivityItem[] = [
  { id: "1", label: "Lead qualification", detail: "WF-002", status: "running", time: "now" },
  { id: "2", label: "Content generation", detail: "WF-007 · Blog post", status: "completed", time: "4m ago" },
  { id: "3", label: "Client onboarding", detail: "WF-003 · Acme Corp", status: "running", time: "12m ago" },
  { id: "4", label: "Weekly report", detail: "WF-009", status: "scheduled", time: "Mon 08:00" },
  { id: "5", label: "Email follow-up sequence", detail: "WF-006 · 3 leads", status: "completed", time: "1h ago" },
  { id: "6", label: "Social media publishing", detail: "WF-008 · LinkedIn", status: "scheduled", time: "Today 14:00" },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export default function DashboardPage() {
  const greeting = getGreeting()

  return (
    <div className="animate-fade-in p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-text-primary">
          {greeting}, Vincent
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Your autonomous systems are running.
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Main content row */}
      <div className="grid gap-5 lg:grid-cols-5">
        {/* System Activity */}
        <div className="lg:col-span-3 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              System Activity
            </h2>
            <a href="/portal/automations" className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
              View all →
            </a>
          </div>
          <div className="rounded-lg border border-border-subtle bg-bg-surface">
            <ActivityFeed items={activity} />
          </div>
        </div>

        {/* Automation Network */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            Automation Network
          </h2>
          <div className="rounded-lg border border-border-subtle bg-bg-surface p-4 h-[280px]">
            <AutomationNetwork />
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "New automation", href: "/portal/automations/new", color: "cyan" },
          { label: "Generate content", href: "/portal/ai", color: "violet" },
          { label: "View leads", href: "/portal/leads", color: "default" },
          { label: "Run report", href: "/portal/reports", color: "default" },
        ].map((action) => (
          <a
            key={action.label}
            href={action.href}
            className="flex h-9 items-center justify-center rounded-md border border-border-subtle bg-bg-surface text-sm text-text-secondary hover:border-border hover:text-text-primary transition-all duration-[120ms]"
          >
            {action.label}
          </a>
        ))}
      </div>
    </div>
  )
}
