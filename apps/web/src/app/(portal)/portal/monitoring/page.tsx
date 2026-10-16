import type { Metadata } from "next"
import { Activity } from "lucide-react"

import { getAccountContext } from "@/lib/suite/account"
import { createServiceClient } from "@/lib/supabase/service"
import {
  getRecentChecks,
  getUptimeStats,
} from "@/lib/monitoring/checks"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"
import {
  MonitoringDashboard,
  type MonitoringProjectSummary,
} from "./_components/monitoring-dashboard"
import type {
  ClientProject,
  MonitoringCheckStatus,
} from "@syntra/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export const metadata: Metadata = { title: "Monitoring" }

export const dynamic = "force-dynamic"

export default async function MonitoringPage() {
  const account = await getAccountContext()
  if (account.kind !== "personal") {
    return (
      <PhasePlaceholder
        icon={Activity}
        title="Monitoring"
        phase="Monitoring (personal-account only)"
        description="This view is scoped to personal accounts. Org clients use the existing analytics workflow."
      />
    )
  }

  const db = createServiceClient() as AnyDb
  const { data: projects } = (await db
    .from("client_projects")
    .select("*")
    .eq("user_id", account.user.id)
    .order("created_at", { ascending: false })) as {
    data: ClientProject[] | null
  }

  const rows = projects ?? []
  const summaries: MonitoringProjectSummary[] = await Promise.all(
    rows.map(async (project) => {
      const [stats, recent] = await Promise.all([
        getUptimeStats(project.id),
        getRecentChecks(project.id, 24),
      ])
      return {
        project,
        uptime_pct: stats.uptime_pct,
        latest_status: stats.latest?.status ?? null,
        latest_checked_at: stats.latest?.checked_at ?? null,
        avg_response_time_ms: stats.avg_response_time_ms,
        recent,
      }
    }),
  )

  const latest = summaries
    .map((s) => s.latest_status)
    .filter(Boolean) as MonitoringCheckStatus[]
  const overall: "operational" | "degraded" | "outage" | "unknown" =
    latest.length === 0
      ? "unknown"
      : latest.some((s) => s === "down")
        ? "outage"
        : latest.some((s) => s === "degraded")
          ? "degraded"
          : "operational"

  return <MonitoringDashboard overall={overall} projects={summaries} />
}
