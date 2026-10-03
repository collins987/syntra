import type { Metadata } from "next"
import Link from "next/link"
import { Megaphone, ShieldAlert, Clock } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { getInsights, CLIENT_STATUSES } from "@/lib/insights"
import {
  PageShell, PageHeader, PageBody, KpiCard, Panel, EmptyState, StatusBadge, timeAgo, NoOrg,
} from "@/components/portal/primitives"
import { BarChart, DistributionBars } from "@/components/portal/bar-chart"

export const metadata: Metadata = { title: "Growth" }

// This page is the foundation of SYNTRA Growth, organized around its real
// stages — Attract, Capture, Qualify, Nurture, Convert — each backed by data
// that already exists: lead volume/source (leads.source), scoring (tier),
// Ava's drafted content (ai_approvals), sent emails and real CRM/handoff
// activity (action_log: email.send, crm.upsert). Retain and deeper
// campaign-level Measure (attribution, A/B testing) are real future stages of
// the model — see the roadmap panel at the bottom — but nothing backs them
// yet, so they're disclosed plainly rather than faked with placeholder charts
// or a dummy CRM/campaign UI. Don't add a metric here that isn't a real query.
export default async function GrowthPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Growth" />

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [insights, avaWorkRes, sentRes, crmRes] = await Promise.all([
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
    // crm.upsert — the real, already-implemented Action Gateway capability
    // behind "CRM updates"/"sales handoff" (lib/actions/registry.ts). Showing
    // actual recent activity here rather than inventing a CRM UI.
    db
      .from("action_log")
      .select("id, status, result, request, created_at")
      .eq("org_id", org.org_id)
      .eq("capability", "crm.upsert")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const avaWork: any[] = avaWorkRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sent: any[] = sentRes.data ?? []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const crmActivity: any[] = crmRes.data ?? []
  const pending = avaWork.filter((w) => w.status === "pending").length

  const attracted = insights.leads.total
  const qualified = (insights.leads.byTier["A"] ?? 0) + (insights.leads.byTier["B"] ?? 0)
  const converted = CLIENT_STATUSES.reduce((n, s) => n + (insights.leads.byStatus[s] ?? 0), 0)
  const change = insights.leads.changePct

  const qualifyRate = attracted > 0 ? Math.round((qualified / attracted) * 100) : null
  const convertRate = attracted > 0 ? Math.round((converted / attracted) * 100) : null

  return (
    <PageShell>
      <PageHeader
        title="Growth"
        subtitle="Customer acquisition and growth on autopilot — attract, capture, qualify, nurture and convert, tracked in one place."
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
            label="Attracted"
            value={attracted.toLocaleString()}
            hint={
              change === null
                ? "No prior period to compare"
                : `${change >= 0 ? "+" : ""}${change}% vs previous 30 days`
            }
            tone={change === null ? "default" : change >= 0 ? "success" : "error"}
          />
          <KpiCard label="Qualified" value={qualified} hint="Tier A and B leads" />
          <KpiCard
            label="Nurtured"
            value={sent.filter((s) => s.status === "success").length}
            hint="Emails sent by automations and agents"
          />
          <KpiCard
            label="Converted"
            value={converted}
            hint="Won, customer or active"
            tone={converted > 0 ? "success" : "default"}
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Capture — where leads come from" description="Source tracking across your forms and campaigns.">
            <div className="p-6">
              <DistributionBars
                data={insights.leads.bySource}
                emptyLabel="No leads yet — once your forms and campaigns start capturing, this shows where they came from."
              />
            </div>
          </Panel>

          <Panel title="Attract — leads per day">
            <div className="p-6">
              <BarChart data={insights.leads.daily} caption="New leads" />
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel
            title="Measure — the funnel, this period"
            description="Attract → qualify → convert, from your real lead data."
          >
            <div className="grid grid-cols-3 divide-x divide-border-subtle/50 px-6 py-5 text-center">
              <div>
                <p className="font-mono text-2xl font-semibold text-text-primary">{attracted}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-text-muted">Attracted</p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold text-text-primary">{qualified}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-text-muted">
                  Qualified{qualifyRate !== null ? ` · ${qualifyRate}%` : ""}
                </p>
              </div>
              <div>
                <p className="font-mono text-2xl font-semibold text-text-primary">{converted}</p>
                <p className="mt-1 text-[11px] uppercase tracking-widest text-text-muted">
                  Converted{convertRate !== null ? ` · ${convertRate}%` : ""}
                </p>
              </div>
            </div>
          </Panel>
        </div>

        <div className="mt-6">
          <Panel
            title="Nurture — Ava's work"
            description="Content and outreach your AI growth specialist has prepared."
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

        <div className="mt-6">
          <Panel
            title="Convert — CRM & handoff activity"
            description="Contacts created or updated in your CRM by automations and agents."
          >
            {crmActivity.length === 0 ? (
              <div className="px-6 py-10">
                <EmptyState
                  icon={Megaphone}
                  title="No CRM activity yet"
                  body="When a workflow or agent adds or updates a contact, it shows up here."
                />
              </div>
            ) : (
              <div className="divide-y divide-border-subtle/50">
                {crmActivity.map((c) => {
                  const created = Boolean(c.result?.created)
                  const label = c.request?.email ?? c.result?.leadId ?? "Contact"
                  return (
                    <div key={c.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-text-primary">
                          {created ? "Added" : "Updated"} {label}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-disabled">{timeAgo(c.created_at)}</p>
                      </div>
                      <StatusBadge tone={c.status === "success" ? "success" : "neutral"}>{c.status}</StatusBadge>
                    </div>
                  )
                })}
              </div>
            )}
          </Panel>
        </div>

        <div className="mt-6">
          <Panel title="What's next for Growth" description="On the roadmap — not built yet, not faked here.">
            <div className="divide-y divide-border-subtle/50">
              {[
                {
                  name: "Retain",
                  body: "Lifecycle campaigns, re-engagement and repeat-business tracking for contacts you've already converted.",
                },
                {
                  name: "Measure",
                  body: "Campaign-level attribution and A/B testing infrastructure, linking revenue back to the specific campaign and variant that produced it.",
                },
              ].map((item) => (
                <div key={item.name} className="flex items-start gap-3 px-6 py-4">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-text-disabled" />
                  <div>
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="mt-0.5 text-xs text-text-muted">{item.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </PageBody>
    </PageShell>
  )
}
