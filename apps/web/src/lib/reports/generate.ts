import * as Sentry from "@sentry/nextjs"

import type {
  AssignedClientWorkflow,
  ClientProject,
  ClientServiceKey,
  MonitoringCheckStatus,
  Profile,
  Report,
  SupportRequest,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"
import { getModel, getProvider } from "@/lib/ai/providers"
import { estimateCostUsd, MODELS } from "@/lib/ai/models"
import { getClientWorkflows } from "@/lib/workflows/client"
import { getUptimeStats } from "@/lib/monitoring/checks"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

interface MetricsInputs {
  profile: Pick<Profile, "full_name" | "company_name">
  services: ClientServiceKey[]
  projects: Array<{
    project: ClientProject
    uptime_pct: number
    latest_status: MonitoringCheckStatus | null
    total_checks: number
  }>
  workflows: AssignedClientWorkflow[]
  total_time_saved_minutes: number
  total_cost_saved_usd: number
  active_count: number
  error_count: number
  support: {
    opened: number
    resolved: number
    still_open: number
    avg_hours_to_resolve: number | null
  }
}

export interface ReportInputs extends MetricsInputs {
  period_start: string
  period_end: string
}

export interface GenerateReportResult {
  ok: boolean
  report?: Report
  error?: string
}

/**
 * Builds one monthly report for `userId` covering [period_start, period_end).
 * Gathers metrics from workflows + monitoring + support, asks the AI provider
 * for the executive summary (Claude Sonnet by default via MODELS.reasoning),
 * stores both the structured data and the generated prose in `reports`.
 *
 * Idempotent on (user_id, period_start, period_end): a second call for the
 * same window overwrites via the unique index — admins can regenerate after
 * data lands late without creating duplicate rows.
 */
export async function generateReport(args: {
  user_id: string
  period_start: string
  period_end: string
}): Promise<GenerateReportResult> {
  const inputs = await gatherInputs(args.user_id, args.period_start, args.period_end)
  if (!inputs) return { ok: false, error: "Client not found." }

  const summary = await summarise(inputs)

  const db = createServiceClient() as AnyDb
  const row = {
    user_id: args.user_id,
    period_start: args.period_start,
    period_end: args.period_end,
    summary: summary.text,
    data: toStructured(inputs),
    model: summary.model,
    input_tokens: summary.input_tokens,
    output_tokens: summary.output_tokens,
    cost_usd: summary.cost_usd,
  }

  const { data, error } = (await db
    .from("reports")
    .upsert(row, { onConflict: "user_id,period_start,period_end" })
    .select("*")
    .single()) as { data: Report | null; error: { message: string } | null }

  if (error || !data) {
    return { ok: false, error: error?.message ?? "Failed to save report." }
  }
  return { ok: true, report: data }
}

async function gatherInputs(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<ReportInputs | null> {
  const db = createServiceClient() as AnyDb

  const { data: profile } = (await db
    .from("profiles")
    .select("full_name, company_name")
    .eq("id", userId)
    .maybeSingle()) as {
    data: { full_name: string; company_name: string | null } | null
  }
  if (!profile) return null

  const [
    servicesRes,
    projectsRes,
    workflowsSummary,
    supportRes,
  ] = await Promise.all([
    db
      .from("client_services")
      .select("service")
      .eq("user_id", userId)
      .eq("active", true),
    db.from("client_projects").select("*").eq("user_id", userId),
    getClientWorkflows(userId),
    db
      .from("support_requests")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", periodStart),
  ])

  const projects: ClientProject[] =
    (projectsRes.data as ClientProject[] | null) ?? []
  const projectRows = await Promise.all(
    projects.map(async (project) => {
      const stats = await getUptimeStats(project.id)
      return {
        project,
        uptime_pct: stats.uptime_pct,
        latest_status: stats.latest?.status ?? null,
        total_checks: stats.total,
      }
    }),
  )

  const supportRows: SupportRequest[] =
    (supportRes.data as SupportRequest[] | null) ?? []
  const openedInPeriod = supportRows.filter(
    (r) => r.created_at >= periodStart && r.created_at <= periodEnd,
  )
  const resolvedInPeriod = supportRows.filter(
    (r) =>
      r.resolved_at !== null &&
      r.resolved_at >= periodStart &&
      r.resolved_at <= periodEnd,
  )
  const stillOpen = supportRows.filter(
    (r) => r.status === "open" || r.status === "in_progress",
  )

  const resolveHours: number[] = resolvedInPeriod
    .filter((r) => r.resolved_at)
    .map((r) => {
      const opened = new Date(r.created_at).getTime()
      const resolved = new Date(r.resolved_at as string).getTime()
      return Math.max(0, (resolved - opened) / 3_600_000)
    })
  const avg_hours_to_resolve =
    resolveHours.length === 0
      ? null
      : Math.round(
          (resolveHours.reduce((a, b) => a + b, 0) / resolveHours.length) * 10,
        ) / 10

  const services: ClientServiceKey[] = (
    (servicesRes.data as Array<{ service: ClientServiceKey }> | null) ?? []
  ).map((r) => r.service)

  return {
    period_start: periodStart,
    period_end: periodEnd,
    profile,
    services,
    projects: projectRows,
    workflows: workflowsSummary.workflows,
    total_time_saved_minutes: workflowsSummary.total_time_saved_minutes,
    total_cost_saved_usd: workflowsSummary.total_cost_saved_usd,
    active_count: workflowsSummary.active_count,
    error_count: workflowsSummary.error_count,
    support: {
      opened: openedInPeriod.length,
      resolved: resolvedInPeriod.length,
      still_open: stillOpen.length,
      avg_hours_to_resolve,
    },
  }
}

function toStructured(inputs: ReportInputs) {
  return {
    period: { start: inputs.period_start, end: inputs.period_end },
    profile: inputs.profile,
    services: inputs.services,
    projects: inputs.projects.map((p) => ({
      id: p.project.id,
      name: p.project.name,
      status: p.project.status,
      uptime_pct: p.uptime_pct,
      latest_status: p.latest_status,
      total_checks: p.total_checks,
    })),
    workflows: {
      total: inputs.workflows.length,
      active_count: inputs.active_count,
      error_count: inputs.error_count,
      total_time_saved_minutes: inputs.total_time_saved_minutes,
      total_cost_saved_usd: inputs.total_cost_saved_usd,
      list: inputs.workflows.map((w) => ({
        name: w.name,
        status: w.status,
        time_saved_minutes: w.time_saved_minutes,
        cost_saved_usd: w.cost_saved_usd,
      })),
    },
    support: inputs.support,
  }
}

interface SummaryResult {
  text: string
  model: string | null
  input_tokens: number | null
  output_tokens: number | null
  cost_usd: number | null
}

async function summarise(inputs: ReportInputs): Promise<SummaryResult> {
  // Dry-run / unconfigured path: deterministic text so a report still lands
  // in the client's view even when the Anthropic key isn't set in the
  // environment (local dev, CI). Keeps the UX honest — "no AI copy yet" is
  // better than throwing on a missing env.
  if (process.env.AI_LEAD_DRY_RUN === "1" || !process.env.ANTHROPIC_API_KEY) {
    return {
      text: fallbackSummary(inputs),
      model: null,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
    }
  }

  try {
    const provider = getProvider()
    // getModel() returns MODELS.reasoning on the Anthropic path and the
    // OpenRouter default on the test path — both are Sonnet-tier, which
    // is what reports want (richer prose, higher cost per generation).
    const model = getModel()
    const response = await provider.chat({
      model,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt(inputs) }],
      tools: [],
      maxTokens: 800,
    })

    const text = response.text.trim() || fallbackSummary(inputs)
    const inputTokens = response.usage.inputTokens
    const outputTokens = response.usage.outputTokens
    const cost = estimateCostUsd(model, inputTokens, outputTokens)

    return {
      text,
      model: MODELS.reasoning,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: cost,
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { stage: "report_summary" } })
    return {
      text: fallbackSummary(inputs),
      model: null,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
    }
  }
}

const SYSTEM_PROMPT = `You write short, honest monthly reports for a SYNTRA
client. Write in plain, direct English — never marketing language. Lead with
the single most important fact of the month. Mention outages or problems
plainly if they happened. Keep the whole summary to 3–5 short paragraphs. Do
not include a greeting or signature; the UI frames the content. Do not invent
numbers — only use what the structured data provides.`.replace(/\n/g, " ")

function userPrompt(inputs: ReportInputs): string {
  return [
    `Client: ${inputs.profile.full_name}${
      inputs.profile.company_name ? ` (${inputs.profile.company_name})` : ""
    }`,
    `Period: ${inputs.period_start} to ${inputs.period_end}`,
    "",
    "Projects:",
    ...inputs.projects.map(
      (p) =>
        `- ${p.project.name} (${p.project.status})${
          p.total_checks > 0 ? ` · ${p.uptime_pct}% uptime` : " · not monitored yet"
        }${p.latest_status ? ` · latest: ${p.latest_status}` : ""}`,
    ),
    "",
    `Automations: ${inputs.workflows.length} total · ${inputs.active_count} active · ${inputs.error_count} with errors`,
    `Time saved per run (across workflows): ${inputs.total_time_saved_minutes} minutes`,
    `Cost saved per run (across workflows): $${inputs.total_cost_saved_usd.toFixed(2)}`,
    "",
    `Support: ${inputs.support.opened} opened, ${inputs.support.resolved} resolved, ${inputs.support.still_open} still open${
      inputs.support.avg_hours_to_resolve !== null
        ? ` · avg ${inputs.support.avg_hours_to_resolve}h to resolve`
        : ""
    }`,
    "",
    "Write the executive summary.",
  ].join("\n")
}

function fallbackSummary(inputs: ReportInputs): string {
  const projectLine =
    inputs.projects.length === 0
      ? "No projects in the suite this period."
      : `${inputs.projects.length} project${
          inputs.projects.length === 1 ? "" : "s"
        } tracked. ${inputs.projects
          .filter((p) => p.total_checks > 0)
          .map((p) => `${p.project.name} ran at ${p.uptime_pct}% uptime`)
          .slice(0, 3)
          .join("; ") || "No monitoring data for this period yet."}`

  const workflowLine =
    inputs.workflows.length === 0
      ? "No automation workflows active yet."
      : `${inputs.active_count} active workflow${
          inputs.active_count === 1 ? "" : "s"
        }, saving an estimated ${inputs.total_time_saved_minutes} minutes and $${inputs.total_cost_saved_usd.toFixed(
          2,
        )} per run across the suite.`

  const supportLine = `${inputs.support.opened} support request${
    inputs.support.opened === 1 ? "" : "s"
  } opened, ${inputs.support.resolved} resolved${
    inputs.support.avg_hours_to_resolve !== null
      ? `, averaging ${inputs.support.avg_hours_to_resolve}h to close`
      : ""
  }. ${inputs.support.still_open} still open.`

  return [projectLine, workflowLine, supportLine].join("\n\n")
}
