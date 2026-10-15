import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"

// Nightly economics cron — called by .github/workflows/economics-cron.yml.
//
// What it does each run:
//   1. Writes (or upserts) an org_cost_ledger row per org for the current
//      calendar month covering infra, email and payment costs.
//   2. AI cost is intentionally NOT written here — economics.ts reads it live
//      from ai_requests so it is always up to the second.
//   3. Resets monthly_execution_count to 0 on the 1st of the month so the
//      automations portal always shows "executions this month".
//   4. Drains overdue rows from automation_retry_queue — dispatches the n8n
//      re-trigger and marks each row dispatched.
//
// Authentication: CRON_SECRET header — the same secret used by n8n-sync.yml.
// The check is constant-time to prevent timing side-channels.

export const dynamic = "force-dynamic"
export const maxDuration = 60

// ── Cost constants (update when provider pricing changes) ─────────────────────
// These are intentionally conservative estimates used until a per-org invoice
// feed exists. Overestimating cost is always better than underestimating it.

/** Monthly Supabase Pro base cost, shared across all orgs. */
const SUPABASE_MONTHLY_USD = 25
/** Monthly Vercel Pro base cost, shared. */
const VERCEL_MONTHLY_USD = 20
/** Per-email cost (Resend free tier → $0.001 at paid scale). */
const EMAIL_COST_USD_PER_EMAIL = 0.001
/** Stripe processing fee per transaction (2.9% + $0.30). We record the flat
 *  fee portion here; the percentage portion is tracked as payment_fees on the
 *  subscription row where the amount is known. */
const STRIPE_FLAT_FEE_USD = 0.3
/** IntaSend M-Pesa processing flat fee (approximate). */
const INTASEND_FLAT_FEE_USD = 0.15

function monthStart(): Date {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function isFirstOfMonth(): boolean {
  return new Date().getUTCDate() === 1
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still iterate to prevent timing leak on length difference.
    let diff = 0
    for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= 1
    return diff === 0
  }
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Cron is not configured" }, { status: 503 })
  }

  const provided = req.headers.get("x-cron-secret") ?? ""
  if (!constantTimeEqual(provided, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const periodDate = monthStart().toISOString().slice(0, 10) // "YYYY-MM-DD"

  try {
    // ── 1. Fetch base data ──────────────────────────────────────────────────
    const [orgsRes, subsRes, emailRes] = await Promise.all([
      db.from("organizations").select("id"),
      db.from("subscriptions").select("org_id, payment_provider, status"),
      db.from("email_logs").select("org_id, status").gte("created_at", `${periodDate}T00:00:00Z`),
    ])

    const orgs: Array<{ id: string }> = orgsRes.data ?? []
    const subs: Array<{ org_id: string; payment_provider: string; status: string }> =
      subsRes.data ?? []
    const emailLogs: Array<{ org_id: string; status: string }> = emailRes.data ?? []

    const subByOrg = new Map(subs.map((s) => [s.org_id, s]))

    // Count successfully sent emails per org this month.
    const emailsByOrg = new Map<string, number>()
    for (const e of emailLogs) {
      if (e.status === "sent") {
        emailsByOrg.set(e.org_id, (emailsByOrg.get(e.org_id) ?? 0) + 1)
      }
    }

    // ── 2. Build ledger rows ────────────────────────────────────────────────
    const infraCostPerOrg =
      orgs.length > 0
        ? Number(((SUPABASE_MONTHLY_USD + VERCEL_MONTHLY_USD) / orgs.length).toFixed(4))
        : 0

    const ledgerRows: Array<{
      org_id: string
      period: string
      category: string
      amount_usd: number
      source: string
    }> = []

    for (const org of orgs) {
      // Infra cost — shared proportionally across all orgs.
      if (infraCostPerOrg > 0) {
        ledgerRows.push({
          org_id: org.id,
          period: periodDate,
          category: "infra",
          amount_usd: infraCostPerOrg,
          source: "cron:economics",
        })
      }

      // Email cost — proportional to emails sent.
      const emailCount = emailsByOrg.get(org.id) ?? 0
      if (emailCount > 0) {
        ledgerRows.push({
          org_id: org.id,
          period: periodDate,
          category: "email",
          amount_usd: Number((emailCount * EMAIL_COST_USD_PER_EMAIL).toFixed(4)),
          source: "cron:economics",
        })
      }

      // Payment processing cost — one flat fee per active subscription.
      const sub = subByOrg.get(org.id)
      if (sub?.status === "active") {
        const fee =
          sub.payment_provider === "intasend" ? INTASEND_FLAT_FEE_USD : STRIPE_FLAT_FEE_USD
        ledgerRows.push({
          org_id: org.id,
          period: periodDate,
          category: "payments",
          amount_usd: fee,
          source: "cron:economics",
        })
      }
    }

    // Upsert — re-running on the same day overwrites the previous estimate
    // with fresh numbers rather than double-counting.
    let ledgerUpserted = 0
    if (ledgerRows.length > 0) {
      const { error: upsertError } = await db
        .from("org_cost_ledger")
        .upsert(ledgerRows, { onConflict: "org_id,period,category,source" })

      if (upsertError) throw upsertError
      ledgerUpserted = ledgerRows.length
    }

    // ── 3. Reset monthly execution counts on the 1st ───────────────────────
    let countersReset = false
    if (isFirstOfMonth()) {
      await db.rpc("reset_monthly_execution_counts")
      countersReset = true
    }

    // ── 4. Drain overdue retry queue ───────────────────────────────────────
    const { data: pending } = await db
      .from("automation_retry_queue")
      .select("id, automation_id, org_id, retry_count")
      .is("dispatched_at", null)
      .lte("retry_after", new Date().toISOString())
      .limit(50) // cap per run to avoid timeout

    const retries: Array<{ id: string; automation_id: string }> = pending ?? []
    let retriesDispatched = 0

    for (const row of retries) {
      try {
        // Re-trigger via n8n sync — the sync endpoint re-activates the workflow.
        // This is a best-effort fire; the next cron run picks up any stragglers.
        const appUrl = process.env.NEXT_PUBLIC_APP_URL
        const cronSecret = process.env.CRON_SECRET
        if (appUrl && cronSecret) {
          await fetch(`${appUrl}/api/n8n/sync`, {
            method: "POST",
            headers: { "x-cron-secret": cronSecret },
          })
        }

        await db
          .from("automation_retry_queue")
          .update({ dispatched_at: new Date().toISOString() })
          .eq("id", row.id)

        // Mark automation active so it doesn't stay stuck in error state.
        await db
          .from("automations")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", row.automation_id)

        retriesDispatched++
      } catch (retryErr) {
        Sentry.captureException(retryErr, {
          tags: { cron: "economics", phase: "retry_dispatch" },
          extra: { retryRowId: row.id },
        })
      }
    }

    return NextResponse.json({
      ok: true,
      period: periodDate,
      ledgerUpserted,
      countersReset,
      retriesDispatched,
    })
  } catch (err) {
    Sentry.captureException(err, { tags: { cron: "economics" } })
    console.error("[cron:economics]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 })
  }
}
