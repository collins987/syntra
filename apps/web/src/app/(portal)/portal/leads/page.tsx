import type { Metadata } from "next"
import type { Lead } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Users, TrendingUp } from "lucide-react"
import {
  PageShell, PageHeader, PageBody, EmptyState, StatusBadge, type StatusTone,
} from "@/components/portal/primitives"
import { LeadScoreBadge } from "@/components/portal/lead-score-badge"
import { DataTable, type DataTableColumn } from "@/components/portal/data-table"

export const metadata: Metadata = { title: "Leads" }

// "converted" matches the tone used on /portal/clients for the same status —
// the same word means the same colour everywhere in the app.
const STATUS_TONE: Record<string, StatusTone> = {
  new: "cyan",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  lost: "error",
}

export default async function LeadsPage() {
  const org = await getUserOrg()
  const supabase = await createClient()

  let leads: Lead[] = []
  if (org) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("org_id", org.org_id)
      .order("score", { ascending: false })
    leads = data ?? []
  }

  const stats = {
    total: leads.length,
    tierA: leads.filter((l) => l.tier === "A").length,
    newLeads: leads.filter((l) => l.status === "new").length,
  }

  const columns: DataTableColumn<Lead>[] = [
    {
      key: "lead",
      header: "Lead",
      width: "1fr",
      render: (lead) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-text-primary">
            {lead.name ?? "Unknown"}
          </p>
          <p className="truncate font-mono text-[11px] text-text-disabled">{lead.email}</p>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      width: "1fr",
      render: (lead) => <p className="truncate text-sm text-text-muted">{lead.company ?? "—"}</p>,
    },
    {
      key: "source",
      header: "Source",
      width: "80px",
      render: (lead) => (
        <span className="truncate font-mono text-xs text-text-disabled capitalize">
          {lead.source ?? "—"}
        </span>
      ),
    },
    {
      key: "score",
      header: "Score",
      width: "64px",
      render: (lead) => <LeadScoreBadge score={lead.score} tier={lead.tier} />,
    },
    {
      key: "status",
      header: "Status",
      width: "100px",
      render: (lead) => (
        <StatusBadge tone={STATUS_TONE[lead.status] ?? "cyan"}>
          <span className="capitalize">{lead.status}</span>
        </StatusBadge>
      ),
    },
  ]

  return (
    <PageShell>
      <PageHeader
        title="Leads"
        subtitle={`${stats.total} total · ${stats.tierA} Tier A · ${stats.newLeads} new`}
        actions={
          <a
            href="/audit"
            target="_blank"
            className="flex h-9 items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-4 text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Audit page
          </a>
        }
      />

      <PageBody>
        {leads.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No leads yet"
            body="Leads captured via your audit page and automation workflows will appear here."
            action={
              <a
                href="/audit"
                target="_blank"
                className="flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors"
              >
                <TrendingUp className="h-3.5 w-3.5" />
                View audit page
              </a>
            }
          />
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-surface">
            <DataTable columns={columns} rows={leads} />
          </div>
        )}
      </PageBody>
    </PageShell>
  )
}
