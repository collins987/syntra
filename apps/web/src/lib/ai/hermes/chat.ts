import * as Sentry from "@sentry/nextjs"

import { getProvider } from "@/lib/ai/providers"
import { estimateCostUsd, MODELS } from "@/lib/ai/models"
import {
  addHermesSpend,
  HERMES_MAX_OUTPUT_TOKENS,
  loadHermesBudget,
} from "./budget"
import {
  buildHermesContext,
  serialiseHermesContext,
} from "./context"
import type { NormalizedMessage } from "@/lib/ai/providers/types"

/**
 * Hard constraints baked into the Hermes system prompt. SYNTRA_SDD.md §4.8
 * enforces these in CODE as well — this prompt is defence-in-depth, not the
 * primary guardrail. The primary guardrails are:
 *   • context is scoped to auth.uid() in buildHermesContext()
 *   • this function never calls the Action Gateway
 *   • this function never writes to any table other than hermes_usage
 *   • tools: [] below, so the model has no tools to call even if it tried
 */
const SYSTEM_PROMPT = `You are Hermes, SYNTRA's in-suite assistant.

You are an advisory assistant only. You cannot execute actions, trigger
workflows, send emails, modify data, or do anything that changes the real
world. You exist to help the signed-in client understand their SYNTRA
services and make decisions.

Rules you must follow in every reply:
- Answer briefly. Plain English. No marketing language.
- Only use information you have been given in this system prompt and in the
  client's messages. Do not invent numbers, dates, or status.
- If asked to do an action (send email, change workflow status, open a
  ticket, pause billing), say you can't and point them to the right place
  (Support, Settings, or Billing).
- Never claim to know what SYNTRA will do next, when something will be
  built, or what another client has. Only speak to the current client's
  own data.

Here is the current state of this client's SYNTRA account. Use ONLY this to
ground your answers.

<CLIENT_CONTEXT>
__CONTEXT__
</CLIENT_CONTEXT>`

export interface HermesChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface HermesChatOk {
  ok: true
  reply: string
  usage: {
    input_tokens: number
    output_tokens: number
    cost_usd: number
  }
  budget: {
    remaining_usd: number
    over_budget: boolean
  }
}

export interface HermesChatRefusal {
  ok: false
  reason: "over_budget" | "no_profile" | "empty_input" | "provider_error"
  message: string
}

/**
 * One turn of Hermes chat. The caller passes the full conversation history
 * (ending with a user turn). Hermes replies as `assistant`. Budget is
 * enforced before the model call and recorded after a successful one.
 */
export async function hermesChat(args: {
  user_id: string
  messages: HermesChatMessage[]
}): Promise<HermesChatOk | HermesChatRefusal> {
  const last = args.messages[args.messages.length - 1]
  if (!last || last.role !== "user" || !last.content.trim()) {
    return {
      ok: false,
      reason: "empty_input",
      message: "No message to answer.",
    }
  }

  const budget = await loadHermesBudget(args.user_id)
  if (budget.over_budget) {
    return {
      ok: false,
      reason: "over_budget",
      message:
        "You've reached this month's Hermes limit. It resets at the start of next month.",
    }
  }

  const context = await buildHermesContext(args.user_id)
  if (!context) {
    return {
      ok: false,
      reason: "no_profile",
      message: "No profile found for this account.",
    }
  }

  const system = SYSTEM_PROMPT.replace(
    "__CONTEXT__",
    serialiseHermesContext(context),
  )

  const normalised: NormalizedMessage[] = args.messages.map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : { role: "assistant", text: m.content, toolCalls: [] },
  )

  try {
    const provider = getProvider()
    const response = await provider.chat({
      // Hermes is always the fast model — cost-efficient for chat and the
      // conservation needed for a per-client monthly budget. getProvider()
      // handles OpenRouter test routing elsewhere.
      model: MODELS.fast,
      system,
      messages: normalised,
      tools: [],
      maxTokens: HERMES_MAX_OUTPUT_TOKENS,
    })

    const reply =
      response.text.trim() ||
      "I'm not sure how to help with that from what I can see. Try asking in another way, or open a Support request."

    const inputTokens = response.usage.inputTokens
    const outputTokens = response.usage.outputTokens
    const costUsd = estimateCostUsd(MODELS.fast, inputTokens, outputTokens)

    await addHermesSpend({
      user_id: args.user_id,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
    })

    const remaining = Math.max(0, budget.remaining_usd - costUsd)
    return {
      ok: true,
      reply,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cost_usd: costUsd,
      },
      budget: {
        remaining_usd: remaining,
        over_budget: remaining <= 0,
      },
    }
  } catch (err) {
    Sentry.captureException(err, { tags: { stage: "hermes_chat" } })
    const message = err instanceof Error ? err.message : "Unknown Hermes error"
    return { ok: false, reason: "provider_error", message }
  }
}
