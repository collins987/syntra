import { createServiceClient } from "@/lib/supabase/service"
import { getCapability } from "@/lib/actions/registry"
import { AGENTS, AGENT_KEYS, type AgentKey } from "./agents"
import { TOOLS } from "./tools"

// The authorisation engine. Claude proposes; this decides. Nothing reaches the
// Action Gateway without passing through here.
// See SYNTRA_BUILD_PLAN.md §3 Decision B and C.

export type Decision = "allow" | "approve" | "deny"

export interface AgentRecord {
  id: string
  org_id: string
  agent_key: AgentKey
  display_name: string
  autonomy_level: number
  status: string
  granted_tools: string[]
  business_context: Record<string, unknown>
}

export interface Authorization {
  decision: Decision
  reason: string
}

/** An agent can never exceed the ceiling declared in its definition. */
export function effectiveAutonomy(agent: AgentRecord): number {
  const ceiling = AGENTS[agent.agent_key]?.ceiling ?? 1
  return Math.min(agent.autonomy_level, ceiling)
}

export function authorizeTool(agent: AgentRecord, toolName: string): Authorization {
  if (agent.status !== "active") {
    return { decision: "deny", reason: `${agent.display_name} is ${agent.status}` }
  }

  const def = AGENTS[agent.agent_key]
  if (!def || !def.tools.includes(toolName)) {
    return {
      decision: "deny",
      reason: `${agent.display_name} is not permitted to use ${toolName}`,
    }
  }

  if (!agent.granted_tools.includes(toolName)) {
    return {
      decision: "deny",
      reason: `${toolName} is not enabled for ${agent.display_name} in this organisation`,
    }
  }

  const tool = TOOLS[toolName]
  if (!tool) {
    return { decision: "deny", reason: `Unknown tool ${toolName}` }
  }

  // Read-only tools have no external effect and are always allowed once granted.
  if (!tool.capability) {
    return { decision: "allow", reason: "Read-only" }
  }

  const capability = getCapability(tool.capability)
  if (!capability) {
    return { decision: "deny", reason: `Capability ${tool.capability} is not registered` }
  }

  // Irreversible actions stay at approval permanently, whatever the level.
  if (capability.irreversible) {
    return {
      decision: "approve",
      reason: "This cannot be undone, so it always needs your approval",
    }
  }

  if (effectiveAutonomy(agent) >= 2) {
    return { decision: "allow", reason: "Within this agent's autonomy level" }
  }

  return {
    decision: "approve",
    reason: `${agent.display_name} is at Level ${effectiveAutonomy(agent)} — actions need approval`,
  }
}

/**
 * Loads an org's agents, creating them at Level 1 on first use.
 * Every agent starts at Level 1 for a new organisation. No exceptions.
 */
export async function ensureAgents(orgId: string): Promise<AgentRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: existing } = await db.from("ai_agents").select("*").eq("org_id", orgId)
  const rows: AgentRecord[] = existing ?? []

  const missing = AGENT_KEYS.filter((k) => !rows.some((r) => r.agent_key === k))
  if (missing.length === 0) return rows

  const { data: inserted } = await db
    .from("ai_agents")
    .insert(
      missing.map((key) => ({
        org_id: orgId,
        agent_key: key,
        display_name: AGENTS[key].name,
        autonomy_level: 1,
        status: "active",
        granted_tools: AGENTS[key].defaultTools,
        business_context: {},
      }))
    )
    .select("*")

  return [...rows, ...((inserted ?? []) as AgentRecord[])]
}

export async function getAgent(orgId: string, key: AgentKey): Promise<AgentRecord | null> {
  const agents = await ensureAgents(orgId)
  return agents.find((a) => a.agent_key === key) ?? null
}
