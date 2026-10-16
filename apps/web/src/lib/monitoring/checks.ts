import type {
  ClientProject,
  MonitoringCheck,
  MonitoringCheckStatus,
} from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

// Treat anything slower than this (but still 2xx) as `degraded` rather than
// `up`. 3s is deliberately permissive — the goal is to flag "something is
// off" not to grade response-time precisely; precise latency belongs in a
// separate pipeline.
const DEGRADED_THRESHOLD_MS = 3_000

// HTTP timeout for a single check. A healthy site should respond long
// before this — passing 10s means a stalled connection registers as down
// in bounded time rather than hanging the cron runner.
const CHECK_TIMEOUT_MS = 10_000

export interface CheckResult {
  status: MonitoringCheckStatus
  status_code: number | null
  response_time_ms: number | null
  error: string | null
}

/**
 * Performs one HTTP health check against `url` and writes the result to
 * monitoring_checks. Returns the written row (useful for the cron runner's
 * alert transition logic) and never throws — a transport error is a
 * check result, not a fatal exception.
 */
export async function runCheck(
  projectId: string,
  url: string,
): Promise<MonitoringCheck | null> {
  const result = await probe(url)
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("monitoring_checks")
    .insert({
      project_id: projectId,
      url,
      status: result.status,
      status_code: result.status_code,
      response_time_ms: result.response_time_ms,
      error: result.error,
      checked_at: new Date().toISOString(),
    })
    .select("*")
    .single()) as { data: MonitoringCheck | null }
  return data
}

async function probe(url: string): Promise<CheckResult> {
  const started = performance.now()
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS)

  try {
    // GET rather than HEAD — some sites 405 HEAD (misconfigured hosts,
    // SPAs sitting behind a CDN) and that would flap the check even
    // though the site is live. The payload is still small on first byte.
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      cache: "no-store",
    })
    const elapsed = Math.round(performance.now() - started)
    clearTimeout(timer)

    if (!res.ok) {
      return {
        status: "down",
        status_code: res.status,
        response_time_ms: elapsed,
        error: `HTTP ${res.status}`,
      }
    }

    return {
      status: elapsed > DEGRADED_THRESHOLD_MS ? "degraded" : "up",
      status_code: res.status,
      response_time_ms: elapsed,
      error: null,
    }
  } catch (err) {
    clearTimeout(timer)
    const elapsed = Math.round(performance.now() - started)
    const message =
      err instanceof Error
        ? err.name === "AbortError"
          ? "Timeout"
          : err.message
        : "Request failed"
    return {
      status: "down",
      status_code: null,
      response_time_ms: elapsed,
      error: message,
    }
  }
}

export interface UptimeStats {
  project_id: string
  total: number
  up: number
  degraded: number
  down: number
  uptime_pct: number
  latest: MonitoringCheck | null
  avg_response_time_ms: number | null
}

/**
 * Rolls up a project's recent checks into the numbers the Monitoring page
 * shows: uptime percentage, latest status, and average response time. The
 * default window is 30 days — rendering the full history row-by-row would
 * be noisy and would scale badly as a client runs for months.
 */
export async function getUptimeStats(
  projectId: string,
  windowDays = 30,
): Promise<UptimeStats> {
  const db = createServiceClient() as AnyDb
  const since = new Date(Date.now() - windowDays * 86_400_000).toISOString()

  const { data } = (await db
    .from("monitoring_checks")
    .select("*")
    .eq("project_id", projectId)
    .gte("checked_at", since)
    .order("checked_at", { ascending: false })) as {
    data: MonitoringCheck[] | null
  }

  const rows = data ?? []
  const total = rows.length
  const up = rows.filter((r) => r.status === "up").length
  const degraded = rows.filter((r) => r.status === "degraded").length
  const down = rows.filter((r) => r.status === "down").length

  // Degraded is still "working" — it counts toward uptime but isn't flat
  // green. Only `down` subtracts from the percentage. Zero checks reads
  // as "unknown" (uptime_pct = 100, latest = null) — the UI should surface
  // the empty-history case explicitly rather than mislead on 100%.
  const uptime_pct = total === 0 ? 100 : Math.round(((up + degraded) / total) * 100)

  const timed = rows.filter((r) => typeof r.response_time_ms === "number")
  const avg_response_time_ms =
    timed.length === 0
      ? null
      : Math.round(
          timed.reduce((sum, r) => sum + (r.response_time_ms ?? 0), 0) /
            timed.length,
        )

  return {
    project_id: projectId,
    total,
    up,
    degraded,
    down,
    uptime_pct,
    latest: rows[0] ?? null,
    avg_response_time_ms,
  }
}

/** Fetches the N most recent checks for a project, newest first. */
export async function getRecentChecks(
  projectId: string,
  limit = 24,
): Promise<MonitoringCheck[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("monitoring_checks")
    .select("*")
    .eq("project_id", projectId)
    .order("checked_at", { ascending: false })
    .limit(limit)) as { data: MonitoringCheck[] | null }
  return data ?? []
}

/**
 * Live projects with a configured live_url, ready for the cron runner to
 * probe. Pulls across every client — the cron is a platform-wide job.
 */
export async function listMonitorableProjects(): Promise<ClientProject[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("client_projects")
    .select("*")
    .in("status", ["building", "live"])
    .not("live_url", "is", null)) as { data: ClientProject[] | null }
  return (data ?? []).filter((p) => Boolean(p.live_url))
}

/** Returns the status of the most recent check prior to `beforeIso`. */
export async function getPreviousStatus(
  projectId: string,
  beforeIso: string,
): Promise<MonitoringCheckStatus | null> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("monitoring_checks")
    .select("status")
    .eq("project_id", projectId)
    .lt("checked_at", beforeIso)
    .order("checked_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as { data: { status: MonitoringCheckStatus } | null }
  return data?.status ?? null
}
