import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { AGENTS, isAgentKey } from "@/lib/ai/agents"

// Agent configuration: autonomy level, pause/resume, tool grants.
// Level 3 requires a deliberate opt-in and is recorded in audit_logs.
// Level 4 does not ship in this plan and is refused outright.

export async function PATCH(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json(
      { error: "Only an organisation admin can change agent settings" },
      { status: 403 }
    )
  }

  let body: {
    agentKey?: string
    autonomyLevel?: number
    status?: string
    grantedTools?: string[]
  }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const agentKey = body.agentKey ?? ""
  if (!isAgentKey(agentKey)) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 })
  }
  const def = AGENTS[agentKey]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}

  if (body.autonomyLevel !== undefined) {
    const level = Number(body.autonomyLevel)
    if (!Number.isInteger(level) || level < 0 || level > 4) {
      return NextResponse.json({ error: "autonomyLevel must be 0–4" }, { status: 400 })
    }
    if (level === 4) {
      return NextResponse.json(
        { error: "Level 4 (proactive) is not available yet." },
        { status: 400 }
      )
    }
    if (level > def.ceiling) {
      return NextResponse.json(
        {
          error: `${def.name} cannot go above Level ${def.ceiling}. ${
            def.ceiling === 2
              ? "Max proposes workflows; a person deploys them."
              : "This is the ceiling for this agent."
          }`,
        },
        { status: 400 }
      )
    }
    update["autonomy_level"] = level
  }

  if (body.status !== undefined) {
    if (!["active", "paused", "disabled"].includes(body.status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 })
    }
    update["status"] = body.status
  }

  if (body.grantedTools !== undefined) {
    if (!Array.isArray(body.grantedTools)) {
      return NextResponse.json({ error: "grantedTools must be an array" }, { status: 400 })
    }
    const invalid = body.grantedTools.filter((t) => !def.tools.includes(t))
    if (invalid.length) {
      return NextResponse.json(
        { error: `${def.name} cannot be granted: ${invalid.join(", ")}` },
        { status: 400 }
      )
    }
    update["granted_tools"] = body.grantedTools
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = await db
    .from("ai_agents")
    .update(update)
    .eq("org_id", org.org_id)
    .eq("agent_key", agentKey)
    .select("*")
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: "Agent not found" }, { status: 404 })

  await db.from("audit_logs").insert({
    org_id: org.org_id,
    user_id: org.userId,
    action: "ai_agent.updated",
    resource_type: "ai_agent",
    resource_id: data.id,
    metadata: { agent_key: agentKey, ...update },
  })

  return NextResponse.json({ ok: true, agent: data })
}
