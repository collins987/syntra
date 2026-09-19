import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Activity } from "lucide-react"
import { PageShell, PageHeader, PageBody, Panel, EmptyState } from "@/components/portal/primitives"

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
    <PageShell>
      <PageHeader title="Activity" subtitle="Audit log of actions taken in your organization." />
      <PageBody>
        <Panel
          title="Recent Events"
          actions={<span className="text-xs text-text-disabled">{rows.length} entries</span>}
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="No activity yet"
              body="Events like automation runs, team changes and billing updates will appear here."
            />
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
        </Panel>
      </PageBody>
    </PageShell>
  )
}
