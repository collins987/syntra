import type { Metadata } from "next"
import { canDecideApprovals, getUserOrg } from "@/lib/org"
import { ensureAgents, effectiveAutonomy } from "@/lib/ai/policy"
import { AGENTS } from "@/lib/ai/agents"
import { NoOrg } from "@/components/portal/primitives"
import { ChatClient, type ChatAgent } from "./_components/chat-client"

export const metadata: Metadata = { title: "AI Center" }

export default async function AiCenterPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="AI Center" />

  const records = await ensureAgents(org.org_id)

  const agents: ChatAgent[] = records
    .map((r) => {
      const def = AGENTS[r.agent_key]
      return {
        key: r.agent_key,
        name: def.name,
        role: def.role,
        blurb: def.blurb,
        status: r.status,
        autonomy: effectiveAutonomy(r),
        tools: r.granted_tools,
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))

  return <ChatClient agents={agents} canDecide={canDecideApprovals(org.role)} />
}
