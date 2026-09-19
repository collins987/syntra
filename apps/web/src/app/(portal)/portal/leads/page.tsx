import type { Metadata } from "next"
import type { Lead } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Users, TrendingUp } from "lucide-react"

export const metadata: Metadata = { title: "Leads" }

type LeadTier = "A" | "B" | "C" | "D"

const TIER_CONFIG: Record<LeadTier, { badge: string }> = {
  A: { badge: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25" },
  B: { badge: "bg-success-500/10 text-success-400 border-success-500/20" },
  C: { badge: "bg-warning-400/10 text-warning-400 border-warning-400/20" },
  D: { badge: "bg-border-strong/30 text-text-muted border-border-subtle" },
}

const STATUS_BADGE: Record<string, string> = {
  new: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  contacted: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  qualified: "bg-success-500/10 text-success-400 border-success-500/20",
  converted: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  lost: "bg-error-500/10 text-error-400 border-error-500/20",
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

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-border-subtle px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Leads</h1>
            <p className="mt-1 text-sm text-text-muted">
              {stats.total} total · {stats.tierA} Tier A · {stats.newLeads} new
            </p>
          </div>
          <a
            href="/audit"
            target="_blank"
            className="flex h-9 items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-4 text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Audit page
          </a>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {leads.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="rounded-xl border border-border-subtle bg-bg-surface">
            <div className="grid grid-cols-[1fr_1fr_80px_64px_100px] gap-4 border-b border-border-subtle/70 px-6 py-3">
              {["Lead", "Company", "Source", "Tier", "Status"].map((h) => (
                <span
                  key={h}
                  className="text-[10px] font-semibold uppercase tracking-wider text-text-disabled"
                >
                  {h}
                </span>
              ))}
            </div>
            <div className="divide-y divide-border-subtle/50">
              {leads.map((lead) => {
                const tier = (lead.tier as LeadTier) ?? "D"
                const tierCfg = TIER_CONFIG[tier]
                const statusCls = STATUS_BADGE[lead.status] ?? STATUS_BADGE.new
                return (
                  <div
                    key={lead.id}
                    className="grid grid-cols-[1fr_1fr_80px_64px_100px] items-center gap-4 px-6 py-3.5 transition-colors hover:bg-bg-elevated/60"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {lead.name ?? "Unknown"}
                      </p>
                      <p className="truncate font-mono text-[11px] text-text-disabled">{lead.email}</p>
                    </div>
                    <p className="truncate text-sm text-text-muted">{lead.company ?? "—"}</p>
                    <span className="truncate font-mono text-xs text-text-disabled capitalize">
                      {lead.source ?? "—"}
                    </span>
                    <span
                      className={`inline-flex w-fit items-center justify-center rounded-md border px-2 py-0.5 text-xs font-bold ${tierCfg.badge}`}
                    >
                      {tier}
                    </span>
                    <span
                      className={`inline-flex w-fit items-center rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${statusCls}`}
                    >
                      {lead.status}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
        <Users className="h-6 w-6 text-text-disabled" />
      </div>
      <p className="text-base font-semibold text-text-primary">No leads yet</p>
      <p className="mt-1 max-w-xs text-sm text-text-muted">
        Leads captured via your audit page and automation workflows will appear here.
      </p>
      <a
        href="/audit"
        target="_blank"
        className="mt-6 flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        View audit page
      </a>
    </div>
  )
}
