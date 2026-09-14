import type { Metadata } from "next"
import Link from "next/link"
import { Plus } from "lucide-react"
import { RunList } from "./_components/run-list"
import type { Run } from "./_components/run-list"

export const metadata: Metadata = { title: "Dashboard" }

const runs: Run[] = [
  {
    id: "run-001",
    name: "Lead qualification",
    workflowId: "WF-002",
    status: "running",
    duration: "0:04",
    time: "now",
    steps: [
      { name: "Initialize workflow", status: "completed", duration: "0.1s" },
      { name: "Fetch lead from CRM", status: "completed", duration: "2.1s" },
      { name: "Run AI analysis", status: "running" },
      { name: "Score and route lead", status: "pending" },
    ],
  },
  {
    id: "run-002",
    name: "Content generation",
    workflowId: "WF-007",
    detail: "Blog post",
    status: "completed",
    duration: "2:14",
    time: "4m ago",
    steps: [
      { name: "Load content brief", status: "completed", duration: "0.8s" },
      { name: "Generate with Claude", status: "completed", duration: "41.2s" },
      { name: "SEO optimization", status: "completed", duration: "8.4s" },
      { name: "Publish to CMS", status: "completed", duration: "2.1s" },
    ],
  },
  {
    id: "run-003",
    name: "Client onboarding",
    workflowId: "WF-003",
    detail: "Acme Corp",
    status: "completed",
    duration: "8:32",
    time: "12m ago",
  },
  {
    id: "run-004",
    name: "Weekly report",
    workflowId: "WF-009",
    status: "scheduled",
    time: "Mon 08:00",
  },
  {
    id: "run-005",
    name: "Email follow-up",
    workflowId: "WF-006",
    detail: "3 leads",
    status: "completed",
    duration: "0:45",
    time: "1h ago",
  },
  {
    id: "run-006",
    name: "Social media publishing",
    workflowId: "WF-008",
    detail: "LinkedIn",
    status: "scheduled",
    time: "Today 14:00",
  },
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
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-text-primary">
              {greeting}, Vincent
            </h1>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              <span className="text-cyan-400">2</span> running
              {" · "}
              <span className="text-success-400">3</span> completed today
              {" · "}
              <span className="text-text-secondary">98.7%</span> success rate
              {" · "}
              <span className="text-text-secondary">$12,840</span> revenue
            </p>
          </div>
          <Link
            href="/portal/automations/new"
            className="inline-flex shrink-0 items-center gap-1.5 rounded border border-border-subtle bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary transition-colors hover:border-border hover:text-text-primary"
          >
            <Plus className="h-3 w-3" />
            New Automation
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-5 p-6">
        {/* Scope info */}
        <div className="space-y-0.5 font-mono text-[11px] text-text-disabled">
          <p>
            {"• Automations in scope: Lead Pipeline · Content Studio · Client Onboarding · Email Sequences · Social"}
          </p>
          <p>
            {"• Next scheduled: Mon 08:00 (WF-009 Weekly Report) · Remote caching disabled"}
          </p>
        </div>

        {/* CI-style run list */}
        <RunList runs={runs} />

        {/* Compact stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: "tokens", label: "AI Tokens", value: "284,192", meta: "this month", delta: "+34.1%" },
            { key: "runtime", label: "Avg Run Time", value: "3m 24s", meta: "per automation", delta: "↓ 12%" },
            { key: "revenue", label: "Revenue", value: "$12,840", meta: "this month", delta: "+22.3%" },
          ].map((s) => (
            <div key={s.key} className="rounded-md border border-border-subtle bg-bg-surface px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-text-disabled">{s.label}</p>
              <p className="mt-1.5 font-mono text-base font-semibold tabular-nums text-text-primary">
                {s.value}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-text-disabled">
                {s.meta}{" "}
                <span className="text-success-400">{s.delta}</span>
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
