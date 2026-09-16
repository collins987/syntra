import type { Metadata } from "next"
import { getUserOrg } from "@/lib/org"
import { ensureAgents, effectiveAutonomy } from "@/lib/ai/policy"
import { AGENTS, AGENT_KEYS } from "@/lib/ai/agents"
import { TOOLS } from "@/lib/ai/tools"
import { getCapability } from "@/lib/actions/registry"
import { NoOrg } from "@/components/portal/primitives"
import { AgentsClient, type AgentView } from "./_components/agents-client"

export const metadata: Metadata = { title: "AI Agents" }

export default async function AiAgentsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="AI Agents" />

  const records = await ensureAgents(org.org_id)
  const byKey = new Map(records.map((r) => [r.agent_key, r]))

  const agents: AgentView[] = AGENT_KEYS.flatMap((key) => {
    const record = byKey.get(key)
    if (!record) return []
    const def = AGENTS[key]

    return [
      {
        key,
        name: def.name,
        role: def.role,
        blurb: def.blurb,
        status: record.status,
        autonomyLevel: record.autonomy_level,
        effectiveLevel: effectiveAutonomy(record),
        ceiling: def.ceiling,
        can: def.can,
        cannot: def.cannot,
        grantedTools: record.granted_tools,
        tools: def.tools.map((t) => {
          const tool = TOOLS[t]
          const capability = tool?.capability ? getCapability(tool.capability) : undefined
          return {
            name: t,
            description: tool?.description ?? "",
            reachesOutside: Boolean(tool?.capability),
            irreversible: capability?.irreversible ?? false,
          }
        }),
      },
    ]
  })

  return <AgentsClient agents={agents} isAdmin={org.role === "CLIENT_ADMIN"} />
}
