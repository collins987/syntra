import type { Metadata } from "next"
import { FileText } from "lucide-react"
import { getUserOrg } from "@/lib/org"
import { getInsights } from "@/lib/insights"
import {
  PageShell, PageHeader, PageBody, KpiCard, Panel, EmptyState, NoOrg,
} from "@/components/portal/primitives"

export const metadata: Metadata = { title: "Reports" }

function weekLabel(offsetWeeks: number): string {
  const end = new Date(Date.now() - offsetWeeks * 7 * 86_400_000)
  const start = new Date(end.getTime() - 6 * 86_400_000)
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" })
  return `${fmt(start)} – ${fmt(end)}`
}

export default async function ReportsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Reports" />

  // Four weekly windows, each computed from the same aggregation the rest of
  // the portal uses, so the numbers always agree.
  const [week, month, quarter] = await Promise.all([
    getInsights(org.org_id, 7),
    getInsights(org.org_id, 30),
    getInsights(org.org_id, 90),
  ])

  const hasData = quarter.leads.total > 0 || quarter.executions.total > 0

  const periods = [
    { key: "week", title: "This week", range: weekLabel(0), data: week },
    { key: "month", title: "Last 30 days", range: "Rolling month", data: month },
    { key: "quarter", title: "Last 90 days", range: "Rolling quarter", data: quarter },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Reports"
        subtitle="Your business at three time horizons. Sent to you weekly by email."
      />
      <PageBody>
        {!hasData ? (
          <EmptyState
            icon={FileText}
            title="No report data yet"
            body="Reports are generated from your leads, automations and billing. Once those start producing activity, your first weekly report will appear here."
          />
        ) : (
          <div className="space-y-6">
            {periods.map(({ key, title, range, data }) => (
              <Panel key={key} title={title} description={range}>
                <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
                  <KpiCard
                    label="Leads"
                    value={data.leads.total.toLocaleString()}
                    hint={
                      data.leads.changePct === null
                        ? "No prior period"
                        : `${data.leads.changePct >= 0 ? "+" : ""}${data.leads.changePct}% vs previous`
                    }
                    tone={
                      data.leads.changePct === null
                        ? "default"
                        : data.leads.changePct >= 0
                          ? "success"
                          : "error"
                    }
                  />
                  <KpiCard
                    label="Automation runs"
                    value={data.executions.total.toLocaleString()}
                    hint={`${data.executions.succeeded} succeeded · ${data.executions.failed} failed`}
                    tone={data.executions.failed > 0 ? "warning" : "default"}
                  />
                  <KpiCard
                    label="Success rate"
                    value={
                      data.executions.successRate === null ? "—" : `${data.executions.successRate}%`
                    }
                    hint={
                      data.executions.successRate === null
                        ? "No completed runs"
                        : "Of finished runs"
                    }
                    tone={
                      data.executions.successRate === null
                        ? "default"
                        : data.executions.successRate >= 95
                          ? "success"
                          : "warning"
                    }
                  />
                  <KpiCard
                    label="AI spend"
                    value={`$${data.ai.costUsd.toFixed(2)}`}
                    hint={`${data.ai.requests} request${data.ai.requests === 1 ? "" : "s"}`}
                  />
                </div>

                <div className="border-t border-border-subtle px-6 py-5">
                  <p className="text-sm leading-relaxed text-text-muted">
                    {summarise(data.leads.total, data.executions.failed, data.executions.successRate, data.periodDays)}
                  </p>
                </div>
              </Panel>
            ))}
          </div>
        )}
      </PageBody>
    </PageShell>
  )
}

function summarise(
  leads: number,
  failures: number,
  successRate: number | null,
  days: number
): string {
  const parts: string[] = []

  parts.push(
    leads === 0
      ? `No new leads in the last ${days} days.`
      : `${leads} new lead${leads === 1 ? "" : "s"} in the last ${days} days.`
  )

  if (successRate !== null) {
    parts.push(
      failures === 0
        ? `Every automation run completed successfully.`
        : `${failures} run${failures === 1 ? "" : "s"} failed, giving a ${successRate}% success rate.`
    )
  } else {
    parts.push("No automations have run in this period.")
  }

  if (failures > 0) {
    parts.push("Ask Max in the AI Center to explain what went wrong.")
  }

  return parts.join(" ")
}
