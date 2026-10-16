import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { createServiceClient } from "@/lib/supabase/service"
import {
  getPreviousStatus,
  listMonitorableProjects,
  runCheck,
} from "@/lib/monitoring/checks"
import { sendMonitoringAlertEmail } from "@/lib/email/templates/monitoring"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * GET /api/cron/monitoring
 *
 * Runs one monitoring tick across every live client_project with a
 * configured live_url. Fires an admin alert when a project transitions
 * from up (or no prior check) to down/degraded. Follow-up ticks on the
 * same still-down project do not re-alert — the admin inbox stays quiet
 * until the project recovers and goes down again.
 *
 * Authentication: CRON_SECRET header matched constant-time, same
 * convention as /api/cron/economics.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 })
  }
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.nextUrl.searchParams.get("secret") ??
    ""
  if (!constantTimeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const projects = await listMonitorableProjects()
  if (projects.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, alerts: 0 })
  }

  // Load the profile and project name lookups we need for alert emails.
  const db = createServiceClient() as AnyDb
  const userIds = Array.from(new Set(projects.map((p) => p.user_id)))
  const { data: profiles } = (await db
    .from("profiles")
    .select("id, full_name")
    .in("id", userIds)) as {
    data: Array<{ id: string; full_name: string }> | null
  }
  const nameByUser = new Map((profiles ?? []).map((p) => [p.id, p.full_name]))

  let alerts = 0
  const results: Array<{
    project_id: string
    status: string
    response_time_ms: number | null
    alerted: boolean
  }> = []

  for (const project of projects) {
    const url = project.live_url ?? ""
    if (!url) continue

    const previous = await getPreviousStatus(project.id, new Date().toISOString())
    const check = await runCheck(project.id, url)
    if (!check) {
      results.push({
        project_id: project.id,
        status: "insert_failed",
        response_time_ms: null,
        alerted: false,
      })
      continue
    }

    // Alert only when the status transitions FROM a healthy state (up,
    // or no prior check) TO a degraded/down one. A still-down check on
    // the next tick stays quiet.
    const wasHealthy = previous === null || previous === "up"
    const nowBad = check.status === "down" || check.status === "degraded"

    let alerted = false
    if (wasHealthy && nowBad && check.status !== "up") {
      try {
        await sendMonitoringAlertEmail({
          clientName: nameByUser.get(project.user_id) ?? "A client",
          projectName: project.name,
          url,
          status: check.status,
          error: check.error,
          responseTimeMs: check.response_time_ms,
        })
        alerted = true
        alerts += 1
      } catch (err) {
        Sentry.captureException(err, {
          tags: { stage: "monitoring_alert" },
          extra: { project_id: project.id },
        })
      }
    }

    results.push({
      project_id: project.id,
      status: check.status,
      response_time_ms: check.response_time_ms,
      alerted,
    })
  }

  return NextResponse.json({
    ok: true,
    checked: projects.length,
    alerts,
    results,
  })
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    let diff = 0
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= 1
    return diff === 0
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}
