// Anthropic adapter — the production path. This is a direct extraction of what
// gateway.ts used to do inline; behaviour for the "anthropic" provider is
// unchanged by this refactor. Still the only file (besides openrouter.ts, which
// touches no SDK at all) permitted to import @anthropic-ai/sdk, per the
// no-restricted-imports rule in eslint.config.mjs.

import Anthropic from "@anthropic-ai/sdk"
import type {
  AIProvider,
  NormalizedMessage,
  NormalizedToolCall,
  ProviderRequest,
  ProviderResponse,
} from "./types"
import { fromWireToolName, toWireToolName } from "./tool-names"

function client(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set")
  return new Anthropic({ apiKey })
}

/** Normalized history → Anthropic's MessageParam[]. */
function toAnthropicMessages(messages: NormalizedMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = []
  for (const m of messages) {
    if (m.role === "user") {
      out.push({ role: "user", content: m.content })
      continue
    }
    if (m.role === "assistant") {
      const content: Anthropic.ContentBlockParam[] = []
      if (m.text) content.push({ type: "text", text: m.text })
      for (const tc of m.toolCalls) {
        content.push({ type: "tool_use", id: tc.id, name: toWireToolName(tc.name), input: tc.input as Record<string, unknown> })
      }
      out.push({ role: "assistant", content })
      continue
    }
    // tool_results: Anthropic groups every result for a turn into one user
    // message's content array, addressed by tool_use_id.
    out.push({
      role: "user",
      content: m.results.map(
        (r): Anthropic.ToolResultBlockParam => ({
          type: "tool_result",
          tool_use_id: r.toolCallId,
          content: r.content,
          is_error: r.isError,
        })
      ),
    })
  }
  return out
}

function toStopReason(reason: Anthropic.Message["stop_reason"]): ProviderResponse["stopReason"] {
  if (reason === "tool_use") return "tool_use"
  if (reason === "end_turn" || reason === "stop_sequence") return "end"
  if (reason === "max_tokens") return "max_tokens"
  return "other"
}

export const anthropicProvider: AIProvider = {
  async chat(req: ProviderRequest): Promise<ProviderResponse> {
    const response = await client().messages.create({
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: toAnthropicMessages(req.messages),
      ...(req.tools.length
        ? { tools: req.tools.map((t) => ({ name: toWireToolName(t.name), description: t.description, input_schema: t.input_schema as Anthropic.Tool.InputSchema })) }
        : {}),
    })

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n\n")

    const toolCalls: NormalizedToolCall[] = response.content
      .filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use")
      .map((b) => ({ id: b.id, name: fromWireToolName(b.name), input: b.input }))

    return {
      text,
      toolCalls,
      stopReason: toStopReason(response.stop_reason),
      usage: {
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      },
    }
  },
}
