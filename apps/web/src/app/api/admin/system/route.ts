import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { getUptimeStats } from "@/lib/monitoring/checks"
import type {
  ClientProject,
  ClientWorkflow,
  MonitoringCheckStatus,
  Profile,
  SupportRequest,
} from "@syntra/db"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

export interface AdminProjectRow {
  project: ClientProject
  owner_full_name: string
  owner_email: string
  uptime_pct: number
  latest_status: MonitoringCheckStatus | null
  latest_checked_at: string | null
}

export interface AdminSystemSnapshot {
  projects: AdminProjectRow[]
  workflow_counts: {
    total: number
    active: number
    inactive: number
    error: number
  }
  support_counts: {
    open: number
    in_progress: number
    resolved_last_7d: number
  }
  overall: "operational" | "degraded" | "outage" | "unknown"
}

/**
 * GET /api/admin/system
 *
 * One-shot snapshot powering the admin System dashboard. Includes
 * per-project uptime across every live client, workflow catalogue health,
 * and support queue counts. Admin-only.
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const db = createServiceClient() as AnyDb

  const [projectsRes, profilesRes, workflowsRes, supportRes] = (await Promise.all([
    db
      .from("client_projects")
      .select("*")
      .order("created_at", { ascending: false }),
    db.from("profiles").select("id, full_name, email"),
    db.from("client_workflows").select("status"),
    db.from("support_requests").select("status, resolved_at"),
  ])) as [
    { data: ClientProject[] | null },
    { data: Pick<Profile, "id" | "full_name" | "email">[] | null },
    { data: Pick<ClientWorkflow, "status">[] | null },
    { data: Pick<SupportRequest, "status" | "resolved_at">[] | null },
  ]

  const projects = projectsRes.data ?? []
  const profiles = profilesRes.data ?? []
  const workflows = workflowsRes.data ?? []
  const supportRows = supportRes.data ?? []

  const profileById = new Map(profiles.map((p) => [p.id, p]))

  const projectRows: AdminProjectRow[] = await Promise.all(
    projects.map(async (project) => {
      const stats = await getUptimeStats(project.id)
      const owner = profileById.get(project.user_id)
      return {
        project,
        owner_full_name: owner?.full_name ?? "Unknown",
        owner_email: owner?.email ?? "",
        uptime_pct: stats.uptime_pct,
        latest_status: stats.latest?.status ?? null,
        latest_checked_at: stats.latest?.checked_at ?? null,
      } satisfies AdminProjectRow
    }),
  )

  const workflow_counts = {
    total: workflows.length,
    active: workflows.filter((w) => w.status === "active").length,
    inactive: workflows.filter((w) => w.status === "inactive").length,
    error: workflows.filter((w) => w.status === "error").length,
  }

  const sevenDaysAgo = Date.now() - 7 * 86_400_000
  const support_counts = {
    open: supportRows.filter((s) => s.status === "open").length,
    in_progress: supportRows.filter((s) => s.status === "in_progress").length,
    resolved_last_7d: supportRows.filter(
      (s) =>
        s.status === "resolved" &&
        s.resolved_at !== null &&
        new Date(s.resolved_at).getTime() >= sevenDaysAgo,
    ).length,
  }

  const latestStatuses = projectRows
    .map((p) => p.latest_status)
    .filter(Boolean) as MonitoringCheckStatus[]
  const overall: AdminSystemSnapshot["overall"] =
    latestStatuses.length === 0
      ? "unknown"
      : latestStatuses.some((s) => s === "down")
        ? "outage"
        : latestStatuses.some((s) => s === "degraded")
          ? "degraded"
          : "operational"

  return NextResponse.json({
    projects: projectRows,
    workflow_counts,
    support_counts,
    overall,
  } satisfies AdminSystemSnapshot)
}
