import Link from "next/link"
import { Users } from "lucide-react"
import type { RecentLead } from "@/lib/dashboard"

// Mirrors the colour map on /portal/leads exactly, so a status reads the same
// wherever it appears. Not imported from there — that file doesn't export it,
// and duplicating four class strings is cheaper than restructuring that page
// just to share them.
const STATUS_BADGE: Record<string, string> = {
  new: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  contacted: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  qualified: "bg-success-500/10 text-success-400 border-success-500/20",
  converted: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  lost: "bg-error-500/10 text-error-400 border-error-500/20",
}

const TIER_COLOR: Record<string, string> = {
  A: "text-success-400",
  B: "text-cyan-400",
  C: "text-warning-400",
  D: "text-error-400",
}

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

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
        <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
            <Users className="h-5 w-5 text-text-disabled" />
          </div>
          <p className="text-sm font-semibold text-text-primary">No leads yet</p>
          <p className="mt-1 max-w-[260px] text-xs text-text-muted">
            Leads captured by your site or audit form will appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-text-disabled">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Company</th>
                <th className="px-3 py-2 font-medium">Score</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2 font-medium">Source</th>
                <th className="px-5 py-2 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/60">
              {leads.map((lead) => (
                <tr key={lead.id} className="text-[12px]">
                  <td className="whitespace-nowrap px-5 py-2.5 font-medium text-text-primary">
                    {lead.name ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">
                    {lead.company ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span className="font-mono tabular-nums text-text-primary">{lead.score}</span>
                    {lead.tier && (
                      <span className={`ml-1.5 font-semibold ${TIER_COLOR[lead.tier] ?? "text-text-disabled"}`}>
                        {lead.tier}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium capitalize ${
                        STATUS_BADGE[lead.status] ?? STATUS_BADGE.new
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-text-muted">
                    {lead.source ?? "—"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-right text-text-disabled">
                    {timeAgo(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
