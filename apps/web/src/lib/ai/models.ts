// Model selection and cost accounting for the AI Gateway.
//
// Rates are USD per million tokens. They drive org_cost_ledger and therefore the
// gross-contribution figure in /admin/economics — verify them against current
// Anthropic pricing before trusting a margin calculation.

export const MODELS = {
  /** Multi-step reasoning, drafting, diagnosis. */
  reasoning: "claude-sonnet-5",
  /** Classification, scoring, short lookups. */
  fast: "claude-haiku-4-5-20251001",
} as const

export type ModelKey = keyof typeof MODELS
export type ModelId = (typeof MODELS)[ModelKey]

interface Rate {
  inputPerMTok: number
  outputPerMTok: number
}

const RATES: Record<string, Rate> = {
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15 },
  "claude-haiku-4-5-20251001": { inputPerMTok: 1, outputPerMTok: 5 },
  "claude-opus-5": { inputPerMTok: 15, outputPerMTok: 75 },
}

const FALLBACK: Rate = { inputPerMTok: 3, outputPerMTok: 15 }

export function estimateCostUsd(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const rate = RATES[model] ?? FALLBACK
  const cost =
    (inputTokens / 1_000_000) * rate.inputPerMTok +
    (outputTokens / 1_000_000) * rate.outputPerMTok
  // ai_requests.cost_usd is numeric(10,6)
  return Number(cost.toFixed(6))
}
