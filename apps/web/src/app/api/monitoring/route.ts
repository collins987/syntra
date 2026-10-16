import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import {
  getRecentChecks,
  getUptimeStats,
} from "@/lib/monitoring/checks"
import type {
  ClientProject,
  MonitoringCheck,
  MonitoringCheckStatus,
} from "@syntra/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface MonitoringProjectSummary {
  project: ClientProject
  uptime_pct: number
  latest_status: MonitoringCheckStatus | null
  latest_checked_at: string | null
  avg_response_time_ms: number | null
  recent: MonitoringCheck[]
}

export interface MonitoringOverview {
  overall: "operational" | "degraded" | "outage" | "unknown"
  projects: MonitoringProjectSummary[]
}

/**
 * GET /api/monitoring
 *
 * Returns a one-shot overview for the signed-in client across every project
 * they have. The client-side page can render all status + history off this
 * single response. 24 recent checks per project gives roughly 2h of history
 * on a 5-min cadence — enough to show a quick trend without ballooning the
 * payload for clients with many projects.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const db = createServiceClient() as AnyDb
  const { data: projects } = (await db
    .from("client_projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as {
    data: ClientProject[] | null
  }

  const rows = projects ?? []
  const summaries = await Promise.all(
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
      } satisfies MonitoringProjectSummary
    }),
  )

  const overall = computeOverall(summaries)
  return NextResponse.json({ overall, projects: summaries } satisfies MonitoringOverview)
}

function computeOverall(
  summaries: MonitoringProjectSummary[],
): MonitoringOverview["overall"] {
  if (summaries.length === 0) return "unknown"
  const latest = summaries.map((s) => s.latest_status).filter(Boolean) as MonitoringCheckStatus[]
  if (latest.length === 0) return "unknown"
  if (latest.some((s) => s === "down")) return "outage"
  if (latest.some((s) => s === "degraded")) return "degraded"
  return "operational"
}
