import type { Metadata } from "next"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import {
  PageShell, PageHeader, PageBody, KpiCard, Panel, EmptyState, StatusBadge, timeAgo, NoOrg,
  type StatusTone,
} from "@/components/portal/primitives"
import { LeadScoreBadge } from "@/components/portal/lead-score-badge"

export const metadata: Metadata = { title: "Clients" }

// Contacts that have progressed past "new" — the people this business is
// actually doing work with, as opposed to raw inbound leads.
const CLIENT_STATUSES = ["won", "customer", "active", "converted"]

const STATUS_TONE: Record<string, StatusTone> = {
  won: "success",
  customer: "success",
  active: "success",
  converted: "success",
  qualified: "cyan",
  contacted: "warning",
}

export default async function ClientsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Clients" />

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from("leads")
    .select("id, name, email, company, status, tier, score, created_at, updated_at")
    .eq("org_id", org.org_id)
    .neq("status", "new")
    .order("updated_at", { ascending: false })
    .limit(200)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? []
  const clients = rows.filter((r) => CLIENT_STATUSES.includes(String(r.status)))
  const inProgress = rows.filter((r) => !CLIENT_STATUSES.includes(String(r.status)))

  return (
    <PageShell>
      <PageHeader
        title="Clients"
        subtitle="Contacts you're actively working with, and the ones still in progress."
      />
      <PageBody>
        {rows.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clients yet"
            body="When a lead moves beyond 'new' — contacted, qualified, won — they appear here. Leads still untouched stay on the Leads page."
          />
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <KpiCard label="Clients" value={clients.length} hint="Converted contacts" tone="success" />
              <KpiCard label="In progress" value={inProgress.length} hint="Contacted or qualified" />
              <KpiCard
                label="Conversion"
                value={rows.length > 0 ? `${Math.round((clients.length / rows.length) * 100)}%` : "—"}
                hint="Of engaged contacts"
              />
            </div>

            <Panel title="All contacts" description={`${rows.length} beyond the new stage`}>
              <div className="divide-y divide-border-subtle/50">
                {rows.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-4 px-6 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {r.name || r.email}
                      </p>
                      <p className="truncate text-xs text-text-disabled">
                        {r.company ? `${r.company} · ` : ""}
                        {r.email}
                      </p>
                    </div>
                    <div className="hidden w-20 shrink-0 text-right sm:block">
                      <p className="mb-1 text-xs text-text-muted">Score</p>
                      {typeof r.score === "number" ? (
                        <LeadScoreBadge score={r.score} tier={r.tier} />
                      ) : (
                        <span className="text-[11px] text-text-disabled">—</span>
                      )}
                    </div>
                    <div className="hidden w-24 shrink-0 text-right md:block">
                      <p className="text-xs text-text-muted">Updated</p>
                      <p className="font-mono text-[11px] text-text-disabled">
                        {timeAgo(r.updated_at ?? r.created_at)}
                      </p>
                    </div>
                    <StatusBadge tone={STATUS_TONE[String(r.status)] ?? "neutral"}>{r.status}</StatusBadge>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        )}
      </PageBody>
    </PageShell>
  )
}
