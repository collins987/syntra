import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { AGENTS, isAgentKey } from "@/lib/ai/agents"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "AI | Admin" }

function monthStartIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString()
}

export default async function AdminAiPage() {
  await requirePlatformAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [orgsRes, requestsRes, budgetsRes, agentsRes, approvalsRes] = await Promise.all([
    db.from("organizations").select("id, name"),
    db
      .from("ai_requests")
      .select("org_id, function_name, input_tokens, output_tokens, cost_usd, status, created_at")
      .gte("created_at", monthStartIso()),
    db.from("ai_usage_budgets").select("org_id, monthly_limit_usd, current_spend_usd, hard_stop"),
    db.from("ai_agents").select("org_id, agent_key, autonomy_level, status"),
    db.from("ai_approvals").select("org_id, status"),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orgs: any[] = orgsRes.data ?? []
  interface Req {
    org_id: string
    function_name: string
    input_tokens: number
    output_tokens: number
    cost_usd: number
    status: string
  }
  const requests: Req[] = requestsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const budgets: any[] = budgetsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents: any[] = agentsRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const approvals: any[] = approvalsRes.data ?? []

  const totalCost = requests.reduce((n, r) => n + Number(r.cost_usd ?? 0), 0)
  const totalTokens = requests.reduce((n, r) => n + (r.input_tokens ?? 0) + (r.output_tokens ?? 0), 0)
  const failures = requests.filter((r) => r.status === "failed").length

  const byAgentKey = requests.reduce<Record<string, { count: number; cost: number }>>((acc, r) => {
    const key = r.function_name.replace(/^agent\./, "")
    const bucket = acc[key] ?? { count: 0, cost: 0 }
    bucket.count += 1
    bucket.cost += Number(r.cost_usd ?? 0)
    acc[key] = bucket
    return acc
  }, {})

  const budgetByOrg = new Map(budgets.map((b) => [b.org_id, b]))
  const costByOrg = new Map<string, number>()
  for (const r of requests) {
    costByOrg.set(r.org_id, (costByOrg.get(r.org_id) ?? 0) + Number(r.cost_usd ?? 0))
  }

  const pendingByOrg = new Map<string, number>()
  for (const a of approvals.filter((a) => a.status === "pending")) {
    pendingByOrg.set(a.org_id, (pendingByOrg.get(a.org_id) ?? 0) + 1)
  }

  const rows = orgs
    .map((o) => {
      const budget = budgetByOrg.get(o.id)
      const limit = Number(budget?.monthly_limit_usd ?? 50)
      const spend = costByOrg.get(o.id) ?? 0
      return {
        id: o.id,
        name: o.name,
        limit,
        spend,
        usedPct: limit > 0 ? Math.round((spend / limit) * 100) : 0,
        hardStop: budget?.hard_stop !== false,
        agents: agents.filter((a) => a.org_id === o.id),
        pending: pendingByOrg.get(o.id) ?? 0,
      }
    })
    .sort((a, b) => b.spend - a.spend)

  return (
    <div className="animate-fade-in px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">AI oversight</h1>
        <p className="mt-1 text-sm text-text-muted">
          Usage, spend and autonomy across every organisation this month.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total spend" value={`$${totalCost.toFixed(2)}`} hint="This month" />
        <Stat label="Requests" value={requests.length.toLocaleString()} hint={`${failures} failed`} />
        <Stat label="Tokens" value={`${(totalTokens / 1000).toFixed(1)}K`} hint="Input + output" />
        <Stat
          label="Pending approvals"
          value={String(approvals.filter((a) => a.status === "pending").length)}
          hint="Awaiting a client decision"
        />
      </div>

      {Object.keys(byAgentKey).length > 0 && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {Object.entries(byAgentKey)
            .sort((a, b) => b[1].cost - a[1].cost)
            .map(([key, stat]) => (
              <div key={key} className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
                <p className="text-sm font-semibold text-text-primary">
                  {isAgentKey(key) ? AGENTS[key].name : key}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-cyan-400">
                  ${stat.cost.toFixed(3)}
                </p>
                <p className="mt-1 text-xs text-text-muted">{stat.count} requests</p>
              </div>
            ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border-subtle text-left">
                {["Organisation", "Spend", "Budget", "Used", "Agents", "Pending"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-bg-surface/50">
                  <td className="px-4 py-3 font-medium text-text-primary">{r.name}</td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">${r.spend.toFixed(3)}</td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">
                    ${r.limit.toFixed(2)}
                    {!r.hardStop && (
                      <span className="ml-2 text-[11px] text-warning-400">no hard stop</span>
                    )}
                  </td>
                  <td
                    className={`px-4 py-3 tabular-nums ${
                      r.usedPct >= 100
                        ? "text-error-400"
                        : r.usedPct >= 80
                          ? "text-warning-400"
                          : "text-text-muted"
                    }`}
                  >
                    {r.usedPct}%
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">
                    {r.agents.length === 0
                      ? "—"
                      : r.agents
                          .map((a: { agent_key: string; autonomy_level: number; status: string }) => {
                            const name = isAgentKey(a.agent_key)
                              ? AGENTS[a.agent_key].name
                              : a.agent_key
                            const paused = a.status !== "active" ? ` (${a.status})` : ""
                            return `${name} L${a.autonomy_level}${paused}`
                          })
                          .join(" · ")}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-muted">{r.pending}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-disabled">
                    No organisations yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-text-primary">{value}</p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  )
}
