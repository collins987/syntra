import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"

export const metadata: Metadata = { title: "Leads" }

const TIER_STYLES: Record<string, string> = {
  A: "border-success-500/20 bg-success-500/10 text-success-400",
  B: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  C: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  D: "border-border-subtle bg-bg-surface text-text-muted",
}

const STATUS_STYLES: Record<string, string> = {
  new: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  contacted: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  qualified: "border-success-500/20 bg-success-500/10 text-success-400",
  closed: "border-border-subtle bg-bg-surface text-text-muted",
  lost: "border-error-500/20 bg-error-500/10 text-error-400",
}

export default async function AdminLeadsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [leadsRes, orgsRes] = await Promise.all([
    db
      .from("leads")
      .select("id, org_id, name, email, company, source, score, tier, status, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    db.from("organizations").select("id, name"),
  ])

  const leads = (leadsRes.data as Array<{
    id: string; org_id: string; name: string | null; email: string; company: string | null
    source: string | null; score: number; tier: string | null; status: string; created_at: string
  }> | null) ?? []

  const orgMap = new Map<string, string>(
    ((orgsRes.data as Array<{ id: string; name: string }> | null) ?? []).map((o) => [o.id, o.name]),
  )

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Leads</h1>
        <p className="mt-1 text-sm text-text-muted">{leads.length} total across all clients</p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Lead", "Company", "Client", "Source", "Score", "Tier", "Status", "Date"].map((h) => (
                  <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-text-primary">{lead.name ?? "—"}</p>
                    <p className="text-xs text-text-disabled">{lead.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-text-secondary">{lead.company ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-text-muted">{orgMap.get(lead.org_id) ?? "—"}</td>
                  <td className="px-5 py-3.5 text-xs text-text-muted capitalize">{lead.source ?? "—"}</td>
                  <td className="px-5 py-3.5 font-mono text-sm text-text-primary">{lead.score}</td>
                  <td className="px-5 py-3.5">
                    {lead.tier ? (
                      <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-bold ${TIER_STYLES[lead.tier] ?? TIER_STYLES.D}`}>
                        {lead.tier}
                      </span>
                    ) : <span className="text-text-disabled">—</span>}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-md border px-2.5 py-0.5 text-[11px] capitalize ${STATUS_STYLES[lead.status] ?? STATUS_STYLES.new}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-text-disabled">
                    {new Date(lead.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {leads.length === 0 && (
            <div className="py-16 text-center text-sm text-text-disabled">No leads yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
