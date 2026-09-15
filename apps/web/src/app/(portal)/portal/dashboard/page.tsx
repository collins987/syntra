import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getDashboardData } from "@/lib/dashboard"
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

function firstName(name: string | null | undefined, email: string | null | undefined) {
  if (name) return name.split(" ")[0]
  if (email) return email.split("@")[0]
  return "there"
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const data = await getDashboardData()

  const greeting = getGreeting()
  const who = firstName(user?.user_metadata?.["name"] as string | undefined, user?.email)

  // User is authenticated but has no organisation — they never finished onboarding.
  if (!data) {
    return (
      <div className="flex h-full items-center justify-center bg-bg-base p-8">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-text-primary">Finish setting up.</h1>
          <p className="mt-2 text-sm text-text-muted">
            Your account exists but isn&apos;t connected to an organisation yet. Complete
            onboarding to activate your command center.
          </p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-bg-base shadow-glow-sm transition-colors hover:bg-cyan-400"
          >
            Complete onboarding <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const automationMeta = Object.fromEntries(
    data.automations.map((a) => [a.id, { name: a.name, workflow_code: a.workflow_code }])
  )

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg-base">
      {/* ── Top: greeting + stat cards ── */}
      <div className="shrink-0 border-b border-border-subtle bg-bg-surface px-8 py-6">
        <div className="flex items-start gap-8">
          <div className="w-[220px] shrink-0">
            <h1 className="text-[38px] font-bold leading-[1.15] tracking-tight text-text-primary">
              {greeting},<br />{who}.
            </h1>
            <p className="mt-2 text-[13px] text-text-muted">
              {data.stats.activeAutomations > 0
                ? "Your autonomous systems are running."
                : "Your command center is ready."}
            </p>
          </div>

          <div className="min-w-0 flex-1">
            <StatBar stats={data.stats} sparklines={data.sparklines} />
          </div>
        </div>
      </div>

      {/* ── Bottom: activity (left) | network + agents (right) ── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border-subtle">
          <LiveActivity
            initial={data.activity}
            orgId={data.orgId}
            automationMeta={automationMeta}
          />
        </div>

        <div className="flex w-[48%] min-w-[450px] shrink-0 flex-col overflow-y-auto">
          <AutomationNetwork automations={data.automations} />
          <AIAgents agents={data.agents} />
        </div>
      </div>
    </div>
  )
}
