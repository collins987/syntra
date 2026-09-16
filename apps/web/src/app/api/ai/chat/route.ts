import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { chat, type ChatMessage } from "@/lib/ai/gateway"
import { isAgentKey } from "@/lib/ai/agents"

const MAX_HISTORY = 20

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  let body: { agentKey?: string; messages?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const agentKey = body.agentKey ?? ""
  if (!isAgentKey(agentKey)) {
    return NextResponse.json({ error: "Unknown agent" }, { status: 400 })
  }

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return NextResponse.json({ error: "messages is required" }, { status: 400 })
  }

  const messages: ChatMessage[] = []
  for (const raw of body.messages.slice(-MAX_HISTORY)) {
    const m = raw as { role?: unknown; content?: unknown }
    if ((m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return NextResponse.json({ error: "Malformed message in history" }, { status: 400 })
    }
    const content = m.content.trim()
    if (content) messages.push({ role: m.role, content: content.slice(0, 8000) })
  }

  if (messages.length === 0 || messages[messages.length - 1]!.role !== "user") {
    return NextResponse.json({ error: "The last message must be from the user" }, { status: 400 })
  }

  const result = await chat({
    orgId: org.org_id,
    agentKey,
    messages,
    userId: org.userId,
  })

  return NextResponse.json({
    ok: result.ok,
    text: result.text,
    approvals: result.approvals,
    actions: result.actions,
    usage: result.usage,
    ...(result.refusal ? { refusal: result.refusal } : {}),
  })
}
