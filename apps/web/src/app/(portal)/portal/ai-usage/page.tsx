import type { Metadata } from "next"
import { Cpu } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { AGENTS, isAgentKey } from "@/lib/ai/agents"
import {
  PageShell, PageHeader, PageBody, StatCard, Panel, EmptyState, NoOrg,
} from "@/components/portal/primitives"
import { BudgetForm } from "./_components/budget-form"

export const metadata: Metadata = { title: "AI Usage" }

function monthStartIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default async function AiUsagePage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="AI Usage" />

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [requestsRes, budgetRes] = await Promise.all([
    db
      .from("ai_requests")
      .select("function_name, model, input_tokens, output_tokens, cost_usd, status, created_at")
      .eq("org_id", org.org_id)
      .gte("created_at", monthStartIso()),
    db
      .from("ai_usage_budgets")
      .select("monthly_limit_usd, current_spend_usd, hard_stop")
      .eq("org_id", org.org_id)
      .maybeSingle(),
  ])

  interface Req {
    function_name: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
    status: string
  }
  const requests: Req[] = requestsRes.data ?? []

  const limit = Number(budgetRes.data?.monthly_limit_usd ?? 50)
  const spend = requests.reduce((n, r) => n + Number(r.cost_usd ?? 0), 0)
  const inputTokens = requests.reduce((n, r) => n + (r.input_tokens ?? 0), 0)
  const outputTokens = requests.reduce((n, r) => n + (r.output_tokens ?? 0), 0)
  const usedPct = limit > 0 ? Math.min(Math.round((spend / limit) * 100), 100) : 0

  const byAgent = Object.entries(
    requests.reduce<Record<string, { count: number; cost: number }>>((acc, r) => {
      const key = r.function_name.replace(/^agent\./, "")
      const bucket = acc[key] ?? { count: 0, cost: 0 }
      bucket.count += 1
      bucket.cost += Number(r.cost_usd ?? 0)
      acc[key] = bucket
      return acc
    }, {})
  ).sort((a, b) => b[1].cost - a[1].cost)

  const tone = usedPct >= 100 ? "bad" : usedPct >= 80 ? "warn" : "default"

  return (
    <PageShell>
      <PageHeader
        title="AI Usage"
        subtitle="What your AI team cost this month, and what's left in the budget."
      />
      <PageBody>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Requests" value={requests.length.toLocaleString()} hint="This month" />
          <StatCard
            label="Tokens"
            value={`${((inputTokens + outputTokens) / 1000).toFixed(1)}K`}
            hint={`${(inputTokens / 1000).toFixed(1)}K in · ${(outputTokens / 1000).toFixed(1)}K out`}
          />
          <StatCard label="Spend" value={`$${spend.toFixed(2)}`} hint={`of $${limit.toFixed(2)}`} tone={tone} />
          <StatCard
            label="Remaining"
            value={`$${Math.max(limit - spend, 0).toFixed(2)}`}
            hint={`${usedPct}% used`}
            tone={tone}
          />
        </div>

        <div className="mb-6 rounded-xl border border-border-subtle bg-bg-elevated p-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-text-muted">Monthly budget</span>
            <span className="tabular-nums text-text-disabled">
              ${spend.toFixed(2)} / ${limit.toFixed(2)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-bg-surface">
            <div
              className={`h-full rounded-full transition-all ${
                usedPct >= 100 ? "bg-error-400" : usedPct >= 80 ? "bg-warning-400" : "bg-cyan-500"
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          {budgetRes.data?.hard_stop !== false && (
            <p className="mt-3 text-xs text-text-disabled">
              Requests are refused once the budget is reached — you will never be billed past it.
            </p>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="By agent">
            {byAgent.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={Cpu}
                  title="No AI activity yet"
                  body="Ask one of your agents a question in the AI Center and usage will show up here."
                />
              </div>
            ) : (
              <div className="divide-y divide-border-subtle/50">
                {byAgent.map(([key, stat]) => (
                  <div key={key} className="flex items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-primary">
                        {isAgentKey(key) ? AGENTS[key].name : key}
                      </p>
                      <p className="text-xs text-text-disabled">
                        {stat.count} request{stat.count === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums text-text-primary">
                        ${stat.cost.toFixed(3)}
                      </p>
                      <p className="text-xs text-text-disabled">
                        {spend > 0 ? Math.round((stat.cost / spend) * 100) : 0}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Budget" description="Raise or lower what your AI team may spend each month.">
            <div className="p-6">
              <BudgetForm
                currentLimit={limit}
                hardStop={budgetRes.data?.hard_stop !== false}
                isAdmin={org.role === "CLIENT_ADMIN"}
              />
            </div>
          </Panel>
        </div>
      </PageBody>
    </PageShell>
  )
}
