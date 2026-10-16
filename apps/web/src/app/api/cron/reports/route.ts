import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

import { createServiceClient } from "@/lib/supabase/service"
import { generateReport } from "@/lib/reports/generate"

export const dynamic = "force-dynamic"
export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * GET /api/cron/reports
 *
 * Generates last month's report for every active personal-account client.
 * Intended to fire on the 1st of each month at 00:30 UTC via the same cron
 * mechanism as /api/cron/economics and /api/cron/monitoring. Idempotent on
 * the (user_id, period_start, period_end) index: a mid-month re-run
 * overwrites rather than duplicates.
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

  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("profiles")
    .select("id, status")
    .eq("status", "active")) as { data: Array<{ id: string; status: string }> | null }
  const activeClients = data ?? []

  const { start, end } = lastMonthRange()

  let generated = 0
  let failed = 0
  const results: Array<{ user_id: string; ok: boolean; error?: string }> = []
  for (const client of activeClients) {
    try {
      const result = await generateReport({
        user_id: client.id,
        period_start: start,
        period_end: end,
      })
      if (result.ok) {
        generated += 1
        results.push({ user_id: client.id, ok: true })
      } else {
        failed += 1
        results.push({
          user_id: client.id,
          ok: false,
          ...(result.error ? { error: result.error } : {}),
        })
      }
    } catch (err) {
      failed += 1
      Sentry.captureException(err, {
        tags: { stage: "reports_cron" },
        extra: { user_id: client.id },
      })
      results.push({
        user_id: client.id,
        ok: false,
        error: err instanceof Error ? err.message : "Unknown error",
      })
    }
  }

  return NextResponse.json({
    ok: true,
    period: { start, end },
    total: activeClients.length,
    generated,
    failed,
    results,
  })
}

function lastMonthRange(): { start: string; end: string } {
  const now = new Date()
  const firstOfThis = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const firstOfLast = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const lastOfLast = new Date(firstOfThis.getTime() - 86_400_000)
  return {
    start: firstOfLast.toISOString().slice(0, 10),
    end: lastOfLast.toISOString().slice(0, 10),
  }
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
