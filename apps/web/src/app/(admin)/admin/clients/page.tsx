import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "Clients" }

const PLAN_LABELS: Record<string, string> = {
  sites: "Sites", flow: "Flow", ai: "AI", os: "OS",
}

const SUB_STATUS_STYLES: Record<string, string> = {
  active: "border-success-500/20 bg-success-500/10 text-success-400",
  trialing: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  past_due: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  canceled: "border-error-500/20 bg-error-500/10 text-error-400",
  paused: "border-border-subtle bg-bg-surface text-text-muted",
}

export default async function AdminClientsPage() {
  await requirePlatformAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [orgsRes, membersRes, subsRes] = await Promise.all([
    db.from("organizations").select("id, name, slug, plan, created_at").order("created_at", { ascending: false }),
    db.from("organization_members").select("org_id"),
    db.from("subscriptions").select("org_id, status, payment_provider"),
  ])

  const orgs = (orgsRes.data as Array<{ id: string; name: string; slug: string; plan: string; created_at: string }> | null) ?? []
  const members = (membersRes.data as Array<{ org_id: string }> | null) ?? []
  const subs = (subsRes.data as Array<{ org_id: string; status: string; payment_provider: string }> | null) ?? []

  const memberCount = new Map<string, number>()
  for (const m of members) memberCount.set(m.org_id, (memberCount.get(m.org_id) ?? 0) + 1)

  const subByOrg = new Map<string, { status: string; payment_provider: string }>()
  for (const s of subs) subByOrg.set(s.org_id, s)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Clients</h1>
        <p className="mt-1 text-sm text-text-muted">{orgs.length} organization{orgs.length !== 1 ? "s" : ""}</p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Organization", "Plan", "Members", "Subscription", "Joined"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {orgs.map((org) => {
                const sub = subByOrg.get(org.id)
                const count = memberCount.get(org.id) ?? 0
                return (
                  <tr key={org.id} className="hover:bg-white/[0.02] transition">
                    <td className="px-6 py-3.5">
                      <p className="font-medium text-text-primary">{org.name}</p>
                      <p className="text-xs text-text-disabled">{org.slug}</p>
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-400">
                        {PLAN_LABELS[org.plan] ?? org.plan}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-text-secondary">{count}</td>
                    <td className="px-6 py-3.5">
                      {sub ? (
                        <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium capitalize ${SUB_STATUS_STYLES[sub.status] ?? SUB_STATUS_STYLES.paused}`}>
                          {sub.status.replace("_", " ")}
                          {sub.payment_provider === "intasend" ? " 🇰🇪" : ""}
                        </span>
                      ) : (
                        <span className="text-xs text-text-disabled">None</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-xs text-text-disabled">
                      {new Date(org.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {orgs.length === 0 && (
            <div className="py-16 text-center text-sm text-text-disabled">No clients yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
