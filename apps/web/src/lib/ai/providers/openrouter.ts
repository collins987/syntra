// OpenRouter adapter — build/test path only, per AI_PROVIDER_ABSTRACTION_PLAN.md.
// No SDK: OpenRouter is a plain JSON-over-HTTP, OpenAI-chat-completions-shaped
// API, unrelated to Anthropic's own /v1/messages format. Everything below exists
// to translate between that shape and the normalized types both adapters share.

import type {
  AIProvider,
  NormalizedMessage,
  NormalizedToolCall,
  ProviderRequest,
  ProviderResponse,
} from "./types"
import { fromWireToolName, toWireToolName } from "./tool-names"

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>
  tool_call_id?: string
}

/**
 * Normalized history → OpenAI-shaped messages[]. Two structural differences
 * from Anthropic that matter here:
 *   - system is a message in this array, not a separate top-level field.
 *   - each tool result is its OWN message (role: "tool"), never grouped —
 *     a single normalized "tool_results" turn expands to N messages.
 */
function toOpenAiMessages(system: string, messages: NormalizedMessage[]): OpenAiMessage[] {
  const out: OpenAiMessage[] = [{ role: "system", content: system }]
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content })
      continue
    }
    if (m.role === "assistant") {
      out.push({
        role: "assistant",
        content: m.text || null,
        ...(m.toolCalls.length
          ? {
              tool_calls: m.toolCalls.map((tc) => ({
                id: tc.id,
                type: "function" as const,
                function: { name: toWireToolName(tc.name), arguments: JSON.stringify(tc.input) },
              })),
            }
          : {}),
      })
      continue
    }
    for (const r of m.results) {
      // OpenAI has no per-result error flag — fold it into the content the
      // model sees instead, same as how a failed action already reads on the
      // Anthropic side ("Failed: ...").
      out.push({ role: "tool", tool_call_id: r.toolCallId, content: r.content })
    }
  }
  return out
}

function toStopReason(reason: string | null | undefined): ProviderResponse["stopReason"] {
  if (reason === "tool_calls") return "tool_use"
  if (reason === "stop") return "end"
  if (reason === "length") return "max_tokens"
  return "other"
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string | null
      tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }>
    }
    finish_reason: string | null
  }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
}

export const openRouterProvider: AIProvider = {
  async chat(req: ProviderRequest): Promise<ProviderResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set")

    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter asks for these to attribute usage; harmless if ignored.
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "https://www.syntraco.tech",
        "X-Title": "SYNTRA",
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxTokens,
        messages: toOpenAiMessages(req.system, req.messages),
        ...(req.tools.length
          ? {
              tools: req.tools.map((t) => ({
                type: "function",
                function: {
                  name: toWireToolName(t.name),
                  description: t.description,
                  parameters: t.input_schema,
                },
              })),
            }
          : {}),
      }),
      signal: AbortSignal.timeout(60_000),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => "")
      throw new Error(`OpenRouter ${res.status}: ${body.slice(0, 500)}`)
    }

    const data = (await res.json()) as OpenRouterResponse
    const choice = data.choices[0]
    if (!choice) throw new Error("OpenRouter returned no choices")

    const toolCalls: NormalizedToolCall[] = (choice.message.tool_calls ?? []).map((tc) => {
      let input: unknown = {}
      try {
        input = JSON.parse(tc.function.arguments)
      } catch {
        // A model that returns malformed JSON arguments is a model problem, not
        // ours to crash on — surface it as an empty object; the capability's own
        // `validate()` will then reject it with a clear "Invalid input" message.
      }
      return { id: tc.id, name: fromWireToolName(tc.function.name), input }
    })

    return {
      text: choice.message.content ?? "",
      toolCalls,
      stopReason: toStopReason(choice.finish_reason),
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
      },
    }
  },
}
