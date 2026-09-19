// Picks which model provider actually answers a chat() call. Everything else in
// lib/ai/ is written against the normalized AIProvider interface (./types) and
// never needs to know which one is active. See AI_PROVIDER_ABSTRACTION_PLAN.md.
//
// AI_PROVIDER unset or "anthropic" (default): the real thing — production.
// AI_PROVIDER=openrouter: build/test path, needs OPENROUTER_API_KEY (a
// DIFFERENT variable from ANTHROPIC_API_KEY — never reuse one provider's key
// as another's; that mix-up is exactly what this file exists to prevent).

import { MODELS } from "../models"
import { anthropicProvider } from "./anthropic"
import { openRouterProvider } from "./openrouter"
import type { AIProvider } from "./types"

export type ProviderName = "anthropic" | "openrouter"

export function activeProviderName(): ProviderName {
  return process.env.AI_PROVIDER === "openrouter" ? "openrouter" : "anthropic"
}

export function getProvider(): AIProvider {
  return activeProviderName() === "openrouter" ? openRouterProvider : anthropicProvider
}

/**
 * The model id to send, in whichever format the active provider expects.
 * Defaults to the same underlying Claude model family on OpenRouter so
 * build/test behaviour stays close to what production will actually run —
 * override with OPENROUTER_MODEL for a cheaper model during pure plumbing tests.
 */
export function getModel(): string {
  if (activeProviderName() === "openrouter") {
    return process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5"
  }
  return MODELS.reasoning
}

export type { AIProvider } from "./types"
