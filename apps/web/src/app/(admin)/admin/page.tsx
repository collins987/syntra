import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "Admin Overview" }

function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function AdminOverviewPage() {
  await requirePlatformAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [orgsRes, leadsRes, subsRes, invoicesRes] = await Promise.all([
    db.from("organizations").select("id, name, plan, created_at").order("created_at", { ascending: false }),
    db.from("leads").select("id", { count: "exact", head: true }),
    db.from("subscriptions").select("id, status", { count: "exact" }),
    db.from("invoices").select("amount_cents").eq("status", "paid"),
  ])

  const orgs = (orgsRes.data as Array<{ id: string; name: string; plan: string; created_at: string }> | null) ?? []
  const totalLeads = (leadsRes.count as number | null) ?? 0
  const allSubs = (subsRes.data as Array<{ id: string; status: string }> | null) ?? []
  const activeSubs = allSubs.filter((s) => s.status === "active" || s.status === "trialing").length
  const totalRevenue = ((invoicesRes.data as Array<{ amount_cents: number }> | null) ?? []).reduce(
    (sum, i) => sum + i.amount_cents, 0,
  )

  const PLAN_LABELS: Record<string, string> = {
    sites: "Sites", flow: "Flow", ai: "AI", os: "OS",
  }

  const stats = [
    { label: "Total clients", value: orgs.length.toString() },
    { label: "Active subscriptions", value: activeSubs.toString() },
    { label: "Total leads", value: totalLeads.toString() },
    { label: "Total revenue", value: formatCents(totalRevenue) },
  ]

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Overview</h1>
        <p className="mt-1 text-sm text-text-muted">Platform health across all clients.</p>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border-subtle bg-bg-elevated px-5 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">{s.label}</p>
            <p className="mt-2 text-2xl font-bold text-text-primary">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Recent signups</span>
        </div>
        <div className="divide-y divide-border-subtle/50">
          {orgs.slice(0, 15).map((org) => (
            <div key={org.id} className="flex items-center justify-between px-6 py-3.5">
              <div>
                <p className="text-sm font-medium text-text-primary">{org.name}</p>
                <p className="text-xs text-text-disabled font-mono">{org.id.slice(0, 8)}…</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-400">
                  {PLAN_LABELS[org.plan] ?? org.plan}
                </span>
                <span className="text-xs text-text-disabled">{formatDate(org.created_at)}</span>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div className="py-10 text-center text-sm text-text-disabled">No clients yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
