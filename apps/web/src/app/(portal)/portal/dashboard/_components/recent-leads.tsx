import Link from "next/link"
import { Users } from "lucide-react"
import type { RecentLead } from "@/lib/dashboard"
import { StatusBadge, EmptyState, type StatusTone } from "@/components/portal/primitives"
import { LeadScoreBadge } from "@/components/portal/lead-score-badge"
import { DataTable, type DataTableColumn } from "@/components/portal/data-table"

// Same mapping as /portal/leads — the same status word means the same colour
// everywhere, via the one shared StatusBadge rather than each page keeping
// its own copy of this table.
const STATUS_TONE: Record<string, StatusTone> = {
  new: "cyan",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  lost: "error",
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const columns: DataTableColumn<RecentLead>[] = [
  {
    key: "name",
    header: "Name",
    width: "1fr",
    render: (lead) => (
      <p className="truncate text-[12px] font-medium text-text-primary">{lead.name ?? "—"}</p>
    ),
  },
  {
    key: "company",
    header: "Company",
    width: "1fr",
    render: (lead) => <p className="truncate text-[12px] text-text-muted">{lead.company ?? "—"}</p>,
  },
  {
    key: "score",
    header: "Score",
    width: "72px",
    render: (lead) => <LeadScoreBadge score={lead.score} tier={lead.tier} />,
  },
  {
    key: "status",
    header: "Status",
    width: "90px",
    render: (lead) => (
      <StatusBadge tone={STATUS_TONE[lead.status] ?? "cyan"}>
        <span className="capitalize">{lead.status}</span>
      </StatusBadge>
    ),
  },
  {
    key: "source",
    header: "Source",
    width: "90px",
    render: (lead) => <p className="truncate text-[12px] text-text-muted">{lead.source ?? "—"}</p>,
  },
  {
    key: "time",
    header: "Time",
    width: "80px",
    align: "right",
    render: (lead) => (
      <span className="text-[11px] text-text-disabled">{timeAgo(lead.createdAt)}</span>
    ),
  },
]

export function RecentLeads({ leads }: { leads: RecentLead[] }) {
  return (
    <div className="flex flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Recent Leads
        </span>
        <Link
          href="/portal/leads"
          className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted"
        >
          View all
        </Link>
      </div>

      {leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No leads yet"
          body="Leads captured by your site or audit form will appear here."
        />
      ) : (
        <DataTable columns={columns} rows={leads} minWidth="520px" />
      )}
    </div>
  )
}
