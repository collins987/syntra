import type { Metadata } from "next"
import { ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { AGENTS, isAgentKey } from "@/lib/ai/agents"
import {
  PageShell, PageHeader, PageBody, EmptyState, NoOrg,
} from "@/components/portal/primitives"
import { ApprovalList, type ApprovalItem } from "./_components/approval-list"

export const metadata: Metadata = { title: "Approvals" }

export default async function ApprovalsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Approvals" />

  const supabase = await createClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const { data } = await db
    .from("ai_approvals")
    .select("id, agent_key, capability, summary, status, created_at, decided_at, expires_at")
    .eq("org_id", org.org_id)
    .order("created_at", { ascending: false })
    .limit(100)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = data ?? []
  const items: ApprovalItem[] = rows.map((r) => {
    const agentKey = String(r.agent_key)
    return {
      id: String(r.id),
      agentKey,
      agentName: isAgentKey(agentKey) ? AGENTS[agentKey].name : agentKey,
      capability: String(r.capability),
      summary: String(r.summary),
      status: String(r.status),
      createdAt: String(r.created_at),
      expiresAt: String(r.expires_at),
    }
  })

  const pending = items.filter((i) => i.status === "pending")
  const decided = items.filter((i) => i.status !== "pending")

  return (
    <PageShell>
      <PageHeader
        title="Approvals"
        subtitle={
          pending.length > 0
            ? `${pending.length} waiting for your decision`
            : "Nothing waiting on you"
        }
      />
      <PageBody>
        {items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing to approve"
            body="When one of your AI agents wants to do something that reaches the outside world — send an email, post to Slack — it will appear here first."
          />
        ) : (
          <ApprovalList pending={pending} decided={decided} />
        )}
      </PageBody>
    </PageShell>
  )
}
