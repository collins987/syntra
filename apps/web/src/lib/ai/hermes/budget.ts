import type { HermesUsage } from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/** Monthly cap per client, in USD. Haiku's input $1/MTok + output $5/MTok
 *  means $2/month comfortably supports hundreds of back-and-forth messages
 *  of normal size. If a client needs more, raise this per-client in env. */
export const DEFAULT_HERMES_BUDGET_USD = 2

/** Hard ceiling on tokens per single response, independent of monthly budget.
 *  Mirrors the gateway's MAX_OUTPUT_TOKENS to keep behaviour consistent. */
export const HERMES_MAX_OUTPUT_TOKENS = 1024

export interface BudgetStatus {
  limit_usd: number
  spent_usd: number
  remaining_usd: number
  request_count: number
  over_budget: boolean
}

function monthStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  return d.toISOString().slice(0, 10)
}

function budgetUsd(): number {
  const raw = Number(process.env.HERMES_BUDGET_USD)
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_HERMES_BUDGET_USD
}

/**
 * Reads one client's current-month usage. Returns a zero-usage shape if no
 * row exists yet — the next addSpend() creates it on first message.
 */
export async function loadHermesBudget(userId: string): Promise<BudgetStatus> {
  const db = createServiceClient() as AnyDb
  const month = monthStart()
  const { data } = (await db
    .from("hermes_usage")
    .select("*")
    .eq("user_id", userId)
    .eq("month_start", month)
    .maybeSingle()) as { data: HermesUsage | null }

  const limit = budgetUsd()
  const spent = Number(data?.cost_usd ?? 0)
  return {
    limit_usd: limit,
    spent_usd: spent,
    remaining_usd: Math.max(0, limit - spent),
    request_count: data?.request_count ?? 0,
    over_budget: spent >= limit,
  }
}

/**
 * Records a Hermes call's usage into the current month's ledger. Called
 * post-response so a failed API call doesn't eat budget. Upserts so the
 * first call of the month creates the row, every call after increments it.
 */
export async function addHermesSpend(args: {
  user_id: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
}): Promise<void> {
  const db = createServiceClient() as AnyDb
  const month = monthStart()

  // Fetch-then-update rather than INSERT ... ON CONFLICT DO UPDATE because the
  // Supabase JS upsert path doesn't support "set col = col + x" expressions
  // without raw SQL — a tiny two-roundtrip isn't a hot-path cost here.
  const { data: existing } = (await db
    .from("hermes_usage")
    .select("*")
    .eq("user_id", args.user_id)
    .eq("month_start", month)
    .maybeSingle()) as { data: HermesUsage | null }

  if (existing) {
    await db
      .from("hermes_usage")
      .update({
        request_count: existing.request_count + 1,
        input_tokens: existing.input_tokens + args.input_tokens,
        output_tokens: existing.output_tokens + args.output_tokens,
        cost_usd: Number(existing.cost_usd) + args.cost_usd,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", args.user_id)
      .eq("month_start", month)
    return
  }

  await db.from("hermes_usage").insert({
    user_id: args.user_id,
    month_start: month,
    request_count: 1,
    input_tokens: args.input_tokens,
    output_tokens: args.output_tokens,
    cost_usd: args.cost_usd,
  })
}
