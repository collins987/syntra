import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { hermesChat, type HermesChatMessage } from "@/lib/ai/hermes/chat"
import { loadHermesBudget } from "@/lib/ai/hermes/budget"

interface Body {
  messages?: HermesChatMessage[]
}

/**
 * POST /api/ai/hermes — personal-account Hermes chat endpoint.
 *
 * Body: { messages: Array<{role: "user" | "assistant", content: string}> }
 * The final message must be a user turn. No tools, no actions, no DB writes
 * outside hermes_usage. See lib/ai/hermes/chat.ts for the guardrails.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const messages = body.messages ?? []
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages is required." }, { status: 400 })
  }

  // Shallow validation — the chat function also guards, but failing early
  // keeps the model call off the hot path when the shape is wrong.
  for (const m of messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") {
      return NextResponse.json({ error: "Invalid message shape." }, { status: 400 })
    }
  }

  const result = await hermesChat({ user_id: user.id, messages })
  if (!result.ok) {
    const status = result.reason === "over_budget" ? 402 : 400
    return NextResponse.json({ error: result.message, reason: result.reason }, { status })
  }
  return NextResponse.json({
    ok: true,
    reply: result.reply,
    usage: result.usage,
    budget: result.budget,
  })
}

/** GET /api/ai/hermes — budget peek for the chat UI's "remaining" line. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const budget = await loadHermesBudget(user.id)
  return NextResponse.json(budget)
}
