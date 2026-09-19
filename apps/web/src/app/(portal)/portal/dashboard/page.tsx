import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { Suspense } from "react"
import { createClient } from "@/lib/supabase/server"
import { DEFAULT_PERIOD, getDashboardData, isDashboardPeriod } from "@/lib/dashboard"
import { KpiRow } from "./_components/kpi-row"
import { PerformanceChart } from "./_components/performance-chart"
import { PeriodPicker } from "./_components/period-picker"
import { ServiceOverview } from "./_components/service-overview"
import { LiveActivity } from "./_components/live-activity"
import { RecentLeads } from "./_components/recent-leads"
import { AIAgents } from "./_components/ai-agents"
import { AiCost } from "./_components/ai-cost"
import { OsBanner } from "./_components/os-banner"

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

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>
}) {
  const { days } = await searchParams
  const period = isDashboardPeriod(days) ? Number(days) as 7 | 30 | 90 : DEFAULT_PERIOD

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const data = await getDashboardData(period)

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
            className="mt-6 inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-6 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400"
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

  const today = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {greeting}, {who}.
          </h1>
          <p className="mt-1 text-[13px] text-text-muted">
            {data.metrics.activeAutomations > 0
              ? "Here's what's happening with your business today."
              : "Your command center is ready — connect an automation to begin."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <span className="hidden text-[12px] text-text-muted sm:block">{today}</span>
          <Suspense fallback={null}>
            <PeriodPicker value={data.period} />
          </Suspense>
        </div>
      </div>

      {/* ── KPI row ── */}
      <div className="mt-6">
        <KpiRow metrics={data.metrics} period={data.period} />
      </div>

      {/* ── Performance + AI agents ── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <PerformanceChart series={data.series} periodDays={data.period} />

        <div className="rounded-xl border border-border-subtle bg-bg-surface">
          <AIAgents agents={data.agents} />
        </div>
      </div>

      {/* ── Recent leads + service overview ── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
          <RecentLeads leads={data.recentLeads} />
        </div>

        <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
          <ServiceOverview services={data.services} />
        </div>
      </div>

      {/* ── Activity + AI cost ── */}
      <div className="mt-4 grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <div className="min-w-0 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
          <LiveActivity
            initial={data.activity}
            orgId={data.orgId}
            automationMeta={automationMeta}
          />
        </div>

        <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
          <AiCost cost={data.aiCost} />
        </div>
      </div>

      {/* ── OS upsell — hidden once the org is already on it ── */}
      {data.plan !== "os" && (
        <div className="mt-4">
          <OsBanner />
        </div>
      )}
    </div>
  )
}
