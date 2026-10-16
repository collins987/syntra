import type {
  ClientProject,
  ClientServiceKey,
  MonitoringCheckStatus,
  Profile,
  SupportRequest,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"
import { getClientWorkflows } from "@/lib/workflows/client"
import { getUptimeStats } from "@/lib/monitoring/checks"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * Read-only summary of ONE client's current state. The whole purpose of this
 * module is to constrain what Hermes sees: scoped strictly to `user_id =
 * current user`, never a raw DB dump, never another client's row. See
 * SYNTRA_SDD.md §4.8 and ADR-003.
 *
 * Caller: /api/ai/hermes. Nothing else should call this — the shape here is
 * tuned for a system prompt, not for UI rendering.
 */
export interface HermesContext {
  profile: Pick<Profile, "full_name" | "company_name">
  services: ClientServiceKey[]
  projects: Array<{
    name: string
    status: ClientProject["status"]
    live_url: string | null
    uptime_pct: number
    latest_status: MonitoringCheckStatus | null
    total_checks: number
  }>
  workflows: Array<{
    name: string
    status: string
    description: string | null
  }>
  workflow_summary: {
    total: number
    active_count: number
    error_count: number
    total_time_saved_minutes: number
    total_cost_saved_usd: number
  }
  support: {
    open: number
    in_progress: number
    recent_titles: string[]
  }
}

export async function buildHermesContext(userId: string): Promise<HermesContext | null> {
  const db = createServiceClient() as AnyDb

  const { data: profile } = (await db
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", userId)
    .maybeSingle()) as {
    data: { full_name: string; company_name: string | null } | null
  }
  if (!profile) return null

  const [servicesRes, projectsRes, workflowsSummary, supportRes] = await Promise.all([
    db
      .from("client_services")
      .select("service")
      .eq("user_id", userId)
      .eq("active", true),
    db.from("client_projects").select("*").eq("user_id", userId),
    getClientWorkflows(userId),
    db
      .from("support_requests")
      .select("title, status")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5),
  ])

  const projects: ClientProject[] =
    (projectsRes.data as ClientProject[] | null) ?? []
  const projectRows = await Promise.all(
    projects.map(async (project) => {
      const stats = await getUptimeStats(project.id)
      return {
        name: project.name,
        status: project.status,
        live_url: project.live_url,
        uptime_pct: stats.uptime_pct,
        latest_status: stats.latest?.status ?? null,
        total_checks: stats.total,
      }
    }),
  )

  const services: ClientServiceKey[] = (
    (servicesRes.data as Array<{ service: ClientServiceKey }> | null) ?? []
  ).map((r) => r.service)

  const supportRows =
    (supportRes.data as Pick<SupportRequest, "title" | "status">[] | null) ?? []

  return {
    profile,
    services,
    projects: projectRows,
    workflows: workflowsSummary.workflows.map((w) => ({
      name: w.name,
      status: w.status,
      description: w.description,
    })),
    workflow_summary: {
      total: workflowsSummary.workflows.length,
      active_count: workflowsSummary.active_count,
      error_count: workflowsSummary.error_count,
      total_time_saved_minutes: workflowsSummary.total_time_saved_minutes,
      total_cost_saved_usd: workflowsSummary.total_cost_saved_usd,
    },
    support: {
      open: supportRows.filter((r) => r.status === "open").length,
      in_progress: supportRows.filter((r) => r.status === "in_progress").length,
      recent_titles: supportRows.slice(0, 5).map((r) => r.title),
    },
  }
}

/**
 * Serialises a HermesContext into the system-prompt string Hermes receives
 * with every turn. Kept short — the model doesn't need rich formatting here,
 * and every extra token is budget spent.
 */
export function serialiseHermesContext(ctx: HermesContext): string {
  const lines: string[] = []
  lines.push(`Client: ${ctx.profile.full_name}${ctx.profile.company_name ? ` (${ctx.profile.company_name})` : ""}`)
  if (ctx.services.length > 0) lines.push(`Active services: ${ctx.services.join(", ")}`)

  if (ctx.projects.length > 0) {
    lines.push("")
    lines.push("Projects:")
    for (const p of ctx.projects) {
      lines.push(
        `- ${p.name} (${p.status})${
          p.total_checks > 0 ? ` · ${p.uptime_pct}% uptime` : " · not monitored yet"
        }${p.latest_status ? ` · ${p.latest_status}` : ""}`,
      )
    }
  }

  if (ctx.workflow_summary.total > 0) {
    lines.push("")
    lines.push(
      `Automations: ${ctx.workflow_summary.active_count}/${ctx.workflow_summary.total} active · saving ~${ctx.workflow_summary.total_time_saved_minutes}m + $${ctx.workflow_summary.total_cost_saved_usd.toFixed(2)} per run`,
    )
    for (const w of ctx.workflows.slice(0, 5)) {
      lines.push(`- ${w.name} [${w.status}]${w.description ? `: ${w.description}` : ""}`)
    }
  }

  lines.push("")
  lines.push(
    `Support: ${ctx.support.open} open, ${ctx.support.in_progress} in progress`,
  )
  if (ctx.support.recent_titles.length > 0) {
    lines.push(`Recent: ${ctx.support.recent_titles.slice(0, 3).join("; ")}`)
  }

  return lines.join("\n")
}
