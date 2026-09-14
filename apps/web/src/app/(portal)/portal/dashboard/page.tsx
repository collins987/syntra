import type { Metadata } from "next"
import Link from "next/link"
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
  { id: "1", label: "Lead qualification",       detail: "WF-002",              status: "running",   time: "now"          },
  { id: "2", label: "Content generation",       detail: "WF-007 · Blog post",  status: "completed", time: "4m ago"       },
  { id: "3", label: "Client onboarding",        detail: "WF-003 · Acme Corp",  status: "running",   time: "12m ago"      },
  { id: "4", label: "Weekly report",            detail: "WF-009",              status: "scheduled", time: "Mon 08:00"    },
  { id: "5", label: "Email follow-up sequence", detail: "WF-006 · 3 leads",   status: "completed", time: "1h ago"       },
  { id: "6", label: "Social media publishing",  detail: "WF-008 · LinkedIn",   status: "scheduled", time: "Today 14:00"  },
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
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="shrink-0 border-b border-border-subtle px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-text-primary">{greeting}, Vincent</h1>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              Your autonomous systems are running.{" "}
              <span className="text-cyan-400">2 active now</span>
            </p>
          </div>
          <Link
            href="/portal/automations/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-3 py-1.5 font-mono text-xs text-text-secondary transition-colors hover:border-border hover:text-text-primary"
          >
            + New Automation
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-5 p-6">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>

        {/* System Activity + Automation Network */}
        <div className="grid gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-text-disabled">
                System Activity
              </span>
              <a
                href="/portal/automations"
                className="font-mono text-[11px] text-cyan-500 transition-colors hover:text-cyan-400"
              >
                View all →
              </a>
            </div>
            <div className="overflow-hidden rounded-md border border-border-subtle bg-bg-surface">
              <ActivityFeed items={activity} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-text-disabled">
              Automation Network
            </span>
            <div className="rounded-md border border-border-subtle bg-bg-surface p-3" style={{ height: 252 }}>
              <AutomationNetwork />
            </div>
          </div>
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "New automation", href: "/portal/automations/new" },
            { label: "Generate content", href: "/portal/ai" },
            { label: "View leads",      href: "/portal/leads" },
            { label: "Run report",      href: "/portal/reports" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex h-8 items-center justify-center rounded border border-border-subtle bg-bg-surface font-mono text-xs text-text-muted transition-colors hover:border-border hover:text-text-secondary"
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
