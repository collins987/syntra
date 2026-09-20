import type { Metadata } from "next"
import Link from "next/link"
import { Megaphone, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { getInsights } from "@/lib/insights"
import {
  PageShell, PageHeader, PageBody, KpiCard, Panel, EmptyState, StatusBadge, timeAgo, NoOrg,
} from "@/components/portal/primitives"
import { BarChart, DistributionBars } from "@/components/portal/bar-chart"

export const metadata: Metadata = { title: "Marketing" }

export default async function MarketingPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Marketing" />

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [insights, avaWorkRes, sentRes] = await Promise.all([
    getInsights(org.org_id, 30),
    db
      .from("ai_approvals")
      .select("id, summary, status, created_at")
      .eq("org_id", org.org_id)
      .eq("agent_key", "ava")
      .order("created_at", { ascending: false })
      .limit(10),
    db
      .from("action_log")
      .select("id, capability, status, created_at")
      .eq("org_id", org.org_id)
      .eq("capability", "email.send")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avaWork: any[] = avaWorkRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sent: any[] = sentRes.data ?? []
  const pending = avaWork.filter((w) => w.status === "pending").length

  const change = insights.leads.changePct

  return (
    <PageShell>
      <PageHeader
        title="Marketing"
        subtitle="What your marketing brought in over the last 30 days, and what Ava is working on."
        actions={
          pending > 0 ? (
            <Link
              href="/portal/approvals"
              className="flex h-9 items-center gap-2 rounded-xl border border-warning-400/30 bg-warning-400/10 px-4 text-sm font-medium text-warning-400 transition-colors hover:bg-warning-400/15"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              {pending} waiting for approval
            </Link>
          ) : null
        }
      />
      <PageBody>
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="Leads generated"
            value={insights.leads.total.toLocaleString()}
            hint={
              change === null
                ? "No prior period to compare"
                : `${change >= 0 ? "+" : ""}${change}% vs previous 30 days`
            }
            tone={change === null ? "default" : change >= 0 ? "success" : "error"}
          />
          <KpiCard
            label="High-intent (A/B)"
            value={(insights.leads.byTier["A"] ?? 0) + (insights.leads.byTier["B"] ?? 0)}
            hint="Tier A and B leads"
          />
          <KpiCard label="Avg lead score" value={insights.leads.avgScore ?? "—"} hint="0–100" />
          <KpiCard
            label="Emails sent"
            value={sent.filter((s) => s.status === "success").length}
            hint="By your automations and agents"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Leads per day">
            <div className="p-6">
              <BarChart data={insights.leads.daily} caption="New leads" />
            </div>
          </Panel>

          <Panel title="Which channels work">
            <div className="p-6">
              <DistributionBars
                data={insights.leads.bySource}
                emptyLabel="No leads yet — once your forms and campaigns start capturing, this shows where they came from."
              />
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel
            title="Ava's work"
            description="Content and outreach your AI content specialist has prepared."
          >
            {avaWork.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={Megaphone}
                  title="Ava hasn't drafted anything yet"
                  body="Ask Ava in the AI Center to draft an email or review your lead sources, and her work will queue up here."
                  action={
                    <Link
                      href="/portal/ai"
                      className="flex h-9 items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400"
                    >
                      Open AI Center →
                    </Link>
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-border-subtle/50">
                {avaWork.map((w) => (
                  <div key={w.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text-primary">{w.summary}</p>
                      <p className="mt-0.5 text-[11px] text-text-disabled">
                        {timeAgo(w.created_at)}
                      </p>
                    </div>
                    <StatusBadge
                      tone={
                        w.status === "pending"
                          ? "warning"
                          : w.status === "approved"
                            ? "success"
                            : "neutral"
                      }
                    >
                      {w.status}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </PageBody>
    </PageShell>
  )
}
