import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { generateReport } from "@/lib/reports/generate"

interface Body {
  user_id?: string
  period_start?: string
  period_end?: string
}

/**
 * POST /api/admin/reports/generate — admin triggers a report for a client.
 *
 * Dates arrive as ISO (YYYY-MM-DD) strings. If omitted, defaults to the
 * previous calendar month in UTC — the common "generate last month's report"
 * use case the admin UI exposes with a single button.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 })
  }

  const { start, end } = resolvePeriod(body.period_start, body.period_end)

  const result = await generateReport({
    user_id: body.user_id,
    period_start: start,
    period_end: end,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed." }, { status: 400 })
  }
  return NextResponse.json({ ok: true, report: result.report })
}

function resolvePeriod(
  startInput: string | undefined,
  endInput: string | undefined,
): { start: string; end: string } {
  if (startInput && endInput) return { start: startInput, end: endInput }
  const now = new Date()
  const firstOfThis = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const firstOfLast = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  const lastOfLast = new Date(firstOfThis.getTime() - 86_400_000)
  return {
    start: toISODate(firstOfLast),
    end: toISODate(lastOfLast),
  }
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
