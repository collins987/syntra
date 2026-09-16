import type { Metadata } from "next"
import { BarChart3 } from "lucide-react"
import { getUserOrg } from "@/lib/org"
import { getInsights } from "@/lib/insights"
import {
  PageShell, PageHeader, PageBody, StatCard, Panel, EmptyState, NoOrg,
} from "@/components/portal/primitives"
import { BarChart, DistributionBars } from "@/components/portal/bar-chart"

export const metadata: Metadata = { title: "Analytics" }

export default async function AnalyticsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Analytics" />

  const insights = await getInsights(org.org_id, 30)
  const hasData = insights.leads.total > 0 || insights.executions.total > 0

  const change = insights.leads.changePct

  return (
    <PageShell>
      <PageHeader title="Analytics" subtitle="The last 30 days across your business." />
      <PageBody>
        {!hasData ? (
          <EmptyState
            icon={BarChart3}
            title="Nothing to chart yet"
            body="Once leads start arriving and your automations begin running, this page fills in automatically."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Leads"
                value={insights.leads.total.toLocaleString()}
                hint={
                  change === null
                    ? "No prior period to compare"
                    : `${change >= 0 ? "+" : ""}${change}% vs previous 30 days`
                }
                tone={change === null ? "default" : change >= 0 ? "good" : "bad"}
              />
              <StatCard
                label="Avg lead score"
                value={insights.leads.avgScore ?? "—"}
                hint="0–100 across the period"
              />
              <StatCard
                label="Automation runs"
                value={insights.executions.total.toLocaleString()}
                hint={`${insights.executions.failed} failed`}
                tone={insights.executions.failed > 0 ? "warn" : "default"}
              />
              <StatCard
                label="Success rate"
                value={
                  insights.executions.successRate === null
                    ? "—"
                    : `${insights.executions.successRate}%`
                }
                hint={
                  insights.executions.avgDurationMs
                    ? `Avg ${(insights.executions.avgDurationMs / 1000).toFixed(1)}s per run`
                    : "No completed runs yet"
                }
                tone={
                  insights.executions.successRate === null
                    ? "default"
                    : insights.executions.successRate >= 95
                      ? "good"
                      : insights.executions.successRate >= 80
                        ? "warn"
                        : "bad"
                }
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Leads per day">
                <div className="p-6">
                  <BarChart data={insights.leads.daily} caption="New leads" />
                </div>
              </Panel>
              <Panel title="Automation runs per day">
                <div className="p-6">
                  <BarChart data={insights.executions.daily} caption="Executions" />
                </div>
              </Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <Panel title="Lead quality">
                <div className="p-6">
                  <DistributionBars data={insights.leads.byTier} emptyLabel="No scored leads yet" />
                </div>
              </Panel>
              <Panel title="Where leads come from">
                <div className="p-6">
                  <DistributionBars data={insights.leads.bySource} emptyLabel="No leads yet" />
                </div>
              </Panel>
              <Panel title="Pipeline status">
                <div className="p-6">
                  <DistributionBars data={insights.leads.byStatus} emptyLabel="No leads yet" />
                </div>
              </Panel>
            </div>
          </div>
        )}
      </PageBody>
    </PageShell>
  )
}
