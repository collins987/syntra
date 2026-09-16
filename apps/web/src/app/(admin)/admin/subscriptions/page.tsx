import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "Subscriptions" }

const STATUS_STYLES: Record<string, string> = {
  active: "border-success-500/20 bg-success-500/10 text-success-400",
  trialing: "border-cyan-500/20 bg-cyan-500/10 text-cyan-400",
  past_due: "border-warning-400/20 bg-warning-400/10 text-warning-400",
  canceled: "border-error-500/20 bg-error-500/10 text-error-400",
  paused: "border-border-subtle bg-bg-surface text-text-muted",
}

const PLAN_LABELS: Record<string, string> = {
  sites: "Sites", flow: "Flow", ai: "AI", os: "OS",
}

function fmt(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default async function AdminSubscriptionsPage() {
  await requirePlatformAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [subsRes, orgsRes] = await Promise.all([
    db
      .from("subscriptions")
      .select("id, org_id, plan, status, payment_provider, current_period_end, cancel_at, created_at")
      .order("created_at", { ascending: false }),
    db.from("organizations").select("id, name"),
  ])

  const subs = (subsRes.data as Array<{
    id: string; org_id: string; plan: string; status: string; payment_provider: string
    current_period_end: string | null; cancel_at: string | null; created_at: string
  }> | null) ?? []

  const orgMap = new Map<string, string>(
    ((orgsRes.data as Array<{ id: string; name: string }> | null) ?? []).map((o) => [o.id, o.name]),
  )

  const byCounts = {
    active: subs.filter((s) => s.status === "active").length,
    trialing: subs.filter((s) => s.status === "trialing").length,
    past_due: subs.filter((s) => s.status === "past_due").length,
    canceled: subs.filter((s) => s.status === "canceled").length,
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Subscriptions</h1>
        <p className="mt-1 text-sm text-text-muted">{subs.length} total</p>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        {Object.entries(byCounts).map(([status, count]) => (
          <div key={status} className="rounded-xl border border-border-subtle bg-bg-elevated px-5 py-4">
            <p className={`text-[11px] font-semibold uppercase tracking-widest ${STATUS_STYLES[status]?.split(" ").find((c) => c.startsWith("text-")) ?? "text-text-muted"}`}>
              {status.replace("_", " ")}
            </p>
            <p className="mt-2 text-2xl font-bold text-text-primary">{count}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border-subtle">
                {["Client", "Plan", "Status", "Provider", "Renews / Ends", "Created"].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-text-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle/50">
              {subs.map((sub) => (
                <tr key={sub.id} className="hover:bg-white/[0.02] transition">
                  <td className="px-6 py-3.5 font-medium text-text-primary">
                    {orgMap.get(sub.org_id) ?? <span className="text-text-disabled font-mono text-xs">{sub.org_id.slice(0, 8)}…</span>}
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-400">
                      {PLAN_LABELS[sub.plan] ?? sub.plan}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`rounded-md border px-2.5 py-0.5 text-[11px] font-medium capitalize ${STATUS_STYLES[sub.status] ?? STATUS_STYLES.paused}`}>
                      {sub.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-xs text-text-muted capitalize">
                    {sub.payment_provider === "intasend" ? "M-Pesa 🇰🇪" : "Stripe"}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-text-muted">
                    {sub.cancel_at ? `Cancels ${fmt(sub.cancel_at)}` : fmt(sub.current_period_end)}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-text-disabled">{fmt(sub.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {subs.length === 0 && (
            <div className="py-16 text-center text-sm text-text-disabled">No subscriptions yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
