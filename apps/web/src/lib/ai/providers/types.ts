// The normalized shape every AI provider adapter speaks. gateway.ts's tool loop,
// budget check, and policy calls are written against THIS, never against a
// provider's native wire format — that's what makes swapping providers a
// config change instead of a rewrite. See AI_PROVIDER_ABSTRACTION_PLAN.md.

export interface NormalizedToolCall {
  id: string
  name: string
  input: unknown
}

export interface NormalizedToolResult {
  toolCallId: string
  content: string
  isError: boolean
}

/**
 * One turn of conversation history. "tool_results" is its own turn (not folded
 * into "user") because Anthropic and OpenAI-shaped APIs disagree on whether
 * multiple tool results are one message or several — each adapter expands or
 * collapses this as needed for its own wire format.
 */
export type NormalizedMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; text: string; toolCalls: NormalizedToolCall[] }
  | { role: "tool_results"; results: NormalizedToolResult[] }

export interface ProviderTool {
  name: string
  description: string
  input_schema: unknown
}

export interface ProviderRequest {
  model: string
  system: string
  messages: NormalizedMessage[]
  tools: ProviderTool[]
  maxTokens: number
}

export type StopReason = "tool_use" | "end" | "max_tokens" | "other"

export interface ProviderResponse {
  text: string
  toolCalls: NormalizedToolCall[]
  stopReason: StopReason
  usage: { inputTokens: number; outputTokens: number }
}

export interface AIProvider {
  chat(req: ProviderRequest): Promise<ProviderResponse>
}
