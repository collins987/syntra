import type { Metadata } from "next"
import type { Lead } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { ensureScoringPolicy, scoreLead } from "@/lib/leads/scoring"
import { Users, TrendingUp } from "lucide-react"
import {
  PageShell, PageHeader, PageBody, EmptyState, StatusBadge, type StatusTone,
} from "@/components/portal/primitives"
import Link from "next/link"
import { LeadScoreBadge } from "@/components/portal/lead-score-badge"
import { LeadAssignSelect } from "@/components/portal/lead-assign-select"
import { DataTable, type DataTableColumn } from "@/components/portal/data-table"

const SERVICE_LABELS: Record<string, string> = {
  sites: "Sites",
  flow: "Flow",
  growth: "Growth",
  os: "OS",
}

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
  let campaignNames: Record<string, string> = {}
  let members: { id: string; label: string }[] = []
  let reasonsByLeadId: Record<string, string[]> = {}

  if (org) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("org_id", org.org_id)
      .order("score", { ascending: false })
    leads = data ?? []

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any

    const [campaignsRes, membersRes, policy] = await Promise.all([
      db.from("campaigns").select("id, name").eq("org_id", org.org_id),
      db.from("organization_members").select("user_id, role").eq("org_id", org.org_id),
      ensureScoringPolicy(org.org_id),
    ])

    campaignNames = Object.fromEntries(
      (campaignsRes.data ?? []).map((c: { id: string; name: string }) => [c.id, c.name])
    )

    const svc = createServiceClient()
    members = await Promise.all(
      (membersRes.data ?? []).map(async (m: { user_id: string }) => {
        const {
          data: { user: u },
        } = await svc.auth.admin.getUserById(m.user_id)
        return { id: m.user_id, label: u?.email ?? m.user_id }
      })
    )

    reasonsByLeadId = Object.fromEntries(
      leads.map((lead) => [
        lead.id,
        scoreLead(
          {
            interested_service: lead.interested_service,
            source: lead.source,
            revenue: null,
            industry: null,
            created_at: lead.created_at,
            company: lead.company,
          },
          policy
        ).reasons,
      ])
    )
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
        <Link href={`/portal/leads/${lead.id}`} className="block min-w-0 group">
          <p className="truncate text-sm font-semibold text-text-primary group-hover:text-cyan-300 transition-colors">
            {lead.name ?? "Unknown"}
          </p>
          <p className="truncate font-mono text-[11px] text-text-disabled">{lead.email}</p>
        </Link>
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
      render: (lead) => {
        const reasons = reasonsByLeadId[lead.id] ?? []
        return (
          <span title={reasons.length > 0 ? reasons.join(" · ") : "No scoring signals yet"}>
            <LeadScoreBadge score={lead.score} tier={lead.tier} />
          </span>
        )
      },
    },
    {
      key: "interested_service",
      header: "Interest",
      width: "80px",
      render: (lead) => (
        <span className="truncate text-xs text-text-muted">
          {lead.interested_service ? SERVICE_LABELS[lead.interested_service] ?? lead.interested_service : "—"}
        </span>
      ),
    },
    {
      key: "campaign",
      header: "Campaign",
      width: "1fr",
      render: (lead) => (
        <span className="truncate text-xs text-text-muted">
          {lead.campaign_id ? campaignNames[lead.campaign_id] ?? "—" : "—"}
        </span>
      ),
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
    {
      key: "assignment",
      header: "Assigned to",
      width: "180px",
      render: (lead) =>
        org && isOrgAdmin(org.role) ? (
          <LeadAssignSelect
            leadId={lead.id}
            assignedTo={lead.assigned_to}
            assignmentStatus={lead.assignment_status}
            members={members}
          />
        ) : (
          <span className="truncate text-xs text-text-muted">
            {lead.assigned_to ? members.find((m) => m.id === lead.assigned_to)?.label ?? "—" : "Unassigned"}
          </span>
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
