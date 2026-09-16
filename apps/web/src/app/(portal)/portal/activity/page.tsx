import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Activity } from "lucide-react"

export const metadata: Metadata = { title: "Activity" }

const ACTION_LABELS: Record<string, string> = {
  org_created: "Organization created",
  member_invited: "Member invited",
  member_removed: "Member removed",
  member_joined: "Member joined",
  automation_created: "Automation created",
  automation_updated: "Automation updated",
  automation_deleted: "Automation deleted",
  workflow_executed: "Workflow executed",
  lead_created: "Lead captured",
  invoice_paid: "Invoice paid",
  subscription_updated: "Subscription updated",
  settings_updated: "Settings updated",
  "approval.approved": "Agent action approved",
  "approval.rejected": "Agent action rejected",
  "ai_agent.updated": "AI agent settings changed",
  "ai_budget.updated": "AI budget changed",
  "integration.connected": "Integration connected",
  "integration.disconnected": "Integration disconnected",
  "workflow_token.created": "Workflow token created",
}

function formatTs(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export default async function ActivityPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const org = await getUserOrg()
  if (!org) redirect("/onboarding")

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { data: logs } = (await db
    .from("audit_logs")
    .select("id, action, resource_type, resource_id, user_id, ip_address, created_at")
    .eq("org_id", org.org_id)
    .order("created_at", { ascending: false })
    .limit(100)) as {
    data: Array<{
      id: string
      action: string
      resource_type: string
      resource_id: string | null
      user_id: string
      ip_address: string | null
      created_at: string
    }> | null
  }

  const rows = logs ?? []

  return (
    <div className="animate-fade-in p-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">Activity</h1>
        <p className="mt-1 text-sm text-text-muted">Audit log of actions taken in your organization.</p>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4 flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Recent Events
          </span>
          <span className="text-xs text-text-disabled">{rows.length} entries</span>
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border-subtle bg-bg-surface">
              <Activity className="h-5 w-5 text-text-disabled" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-secondary">No activity yet</p>
              <p className="mt-0.5 text-xs text-text-disabled max-w-xs">
                Events like automation runs, team changes and billing updates will appear here.
              </p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle/50">
            {rows.map((log) => (
              <div key={log.id} className="flex items-start justify-between gap-6 px-6 py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-cyan-500/60" />
                  <div>
                    <p className="text-sm text-text-primary">
                      {ACTION_LABELS[log.action] ?? log.action.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-xs text-text-disabled">
                      {log.resource_type}{log.resource_id ? ` · ${log.resource_id.slice(0, 8)}…` : ""}
                      {log.ip_address ? ` · ${log.ip_address}` : ""}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 text-xs text-text-disabled">{formatTs(log.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
