import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"
import { executeAction, logBlocked } from "@/lib/actions/gateway"
import { getCapability } from "@/lib/actions/registry"
import { estimateCostUsd } from "./models"
import { getModel, getProvider } from "./providers"
import type { NormalizedMessage, NormalizedToolResult } from "./providers/types"
import { AGENTS, isAgentKey, type AgentKey } from "./agents"
import { TOOLS, executeReadTool } from "./tools"
import {
  authorizeApprovedAction,
  authorizeTool,
  effectiveAutonomy,
  getAgent,
  type AgentRecord,
} from "./policy"

// The model-calling boundary. Only ./providers/anthropic.ts and its own SDK
// import touch @anthropic-ai/sdk directly (enforced by no-restricted-imports in
// eslint.config.mjs) — this file talks to whichever provider is active through
// the normalized AIProvider interface in ./providers, never a native SDK shape.
// See AI_PROVIDER_ABSTRACTION_PLAN.md.
//
// Everything a model request must pass through lives here: budget, rate limit,
// model selection, tool grants, policy, cost accounting and logging.
// See SYNTRA_BUILD_PLAN.md §3 Decision D.

const MAX_TOOL_TURNS = 4
const MAX_OUTPUT_TOKENS = 2048

export interface ChatMessage {
  role: "user" | "assistant"
  content: string
}

export interface PendingApproval {
  id: string
  capability: string
  summary: string
}

export interface ExecutedAction {
  capability: string
  status: string
  error?: string
}

export interface ChatResult {
  ok: boolean
  text: string
  approvals: PendingApproval[]
  actions: ExecutedAction[]
  usage: { inputTokens: number; outputTokens: number; costUsd: number }
  /** Set when the request was refused before reaching the model. */
  refusal?: string
}

// ── Budget ───────────────────────────────────────────────────────────────────

interface Budget {
  monthly_limit_usd: number
  current_spend_usd: number
  hard_stop: boolean
  overage_allowed_usd: number
  last_reset_at: string
}

function isPreviousMonth(iso: string): boolean {
  const then = new Date(iso)
  const now = new Date()
  return (
    then.getUTCFullYear() !== now.getUTCFullYear() || then.getUTCMonth() !== now.getUTCMonth()
  )
}

async function loadBudget(orgId: string): Promise<Budget> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = await db
    .from("ai_usage_budgets")
    .select("monthly_limit_usd, current_spend_usd, hard_stop, overage_allowed_usd, last_reset_at")
    .eq("org_id", orgId)
    .maybeSingle()

  if (!data) {
    const fresh = {
      org_id: orgId,
      monthly_limit_usd: 50,
      current_spend_usd: 0,
      hard_stop: true,
      overage_allowed_usd: 0,
      last_reset_at: new Date().toISOString(),
    }
    await db.from("ai_usage_budgets").insert(fresh)
    return fresh
  }

  if (isPreviousMonth(data.last_reset_at)) {
    const reset = { current_spend_usd: 0, last_reset_at: new Date().toISOString() }
    await db.from("ai_usage_budgets").update(reset).eq("org_id", orgId)
    return { ...data, ...reset }
  }

  return data
}

async function addSpend(orgId: string, amountUsd: number, current: number): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  await db
    .from("ai_usage_budgets")
    .update({ current_spend_usd: Number((current + amountUsd).toFixed(4)) })
    .eq("org_id", orgId)
}

// ── Prompt ───────────────────────────────────────────────────────────────────

async function buildSystemPrompt(agent: AgentRecord): Promise<string> {
  const def = AGENTS[agent.agent_key]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: org } = await db
    .from("organizations")
    .select("name, industry, plan")
    .eq("id", agent.org_id)
    .maybeSingle()

  const level = effectiveAutonomy(agent)

  return [
    def.persona,
    "",
    `You work for ${org?.name ?? "this business"}${org?.industry ? `, a ${org.industry} business` : ""}.`,
    org?.plan ? `They are on the ${org.plan} plan.` : "",
    "",
    `Your autonomy level is ${level}.`,
    level <= 1
      ? "Anything that affects the outside world is queued for the owner to approve. Say so plainly when you queue something — do not claim you have done it."
      : "You may carry out reversible actions directly. Anything irreversible still needs approval.",
    "",
    "Rules:",
    "- Only use the tools you have been given. If you need something you cannot reach, say what you need and why.",
    "- Never invent numbers. If a tool returns no data, say there is no data yet.",
    "- Write for a busy business owner: short sentences, no jargon, no preamble.",
    "- Never mention Claude, Anthropic, n8n, Supabase or any internal tooling by name.",
    `- You are ${def.name}. Never claim to be a general assistant.`,
  ]
    .filter(Boolean)
    .join("\n")
}

// ── Logging ──────────────────────────────────────────────────────────────────

async function recordRequest(params: {
  orgId: string
  agentKey: AgentKey
  model: string
  inputTokens: number
  outputTokens: number
  costUsd: number
  durationMs: number
  status: string
  error?: string | null
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  await db.from("ai_requests").insert({
    org_id: params.orgId,
    function_name: `agent.${params.agentKey}`,
    function_version: "1.0",
    model: params.model,
    input_tokens: params.inputTokens,
    output_tokens: params.outputTokens,
    cost_usd: params.costUsd,
    duration_ms: params.durationMs,
    status: params.status,
    error: params.error ?? null,
  })
}

// ── Chat ─────────────────────────────────────────────────────────────────────

export async function chat(params: {
  orgId: string
  agentKey: AgentKey
  messages: ChatMessage[]
  userId: string
}): Promise<ChatResult> {
  const { orgId, agentKey, messages, userId } = params
  const empty = { inputTokens: 0, outputTokens: 0, costUsd: 0 }

  const agent = await getAgent(orgId, agentKey)
  if (!agent) {
    return { ok: false, text: "", approvals: [], actions: [], usage: empty, refusal: "Agent not found" }
  }
  if (agent.status !== "active") {
    return {
      ok: false,
      text: "",
      approvals: [],
      actions: [],
      usage: empty,
      refusal: `${agent.display_name} is currently ${agent.status}. Resume them in AI Agents to continue.`,
    }
  }

  const budget = await loadBudget(orgId)
  const ceiling = Number(budget.monthly_limit_usd) + Number(budget.overage_allowed_usd)
  if (budget.hard_stop && Number(budget.current_spend_usd) >= ceiling) {
    return {
      ok: false,
      text: "",
      approvals: [],
      actions: [],
      usage: empty,
      refusal: `This month's AI budget of $${Number(budget.monthly_limit_usd).toFixed(2)} is used up. Raise the limit in AI Usage to continue.`,
    }
  }

  const grantedTools = AGENTS[agentKey].tools
    .filter((t) => agent.granted_tools.includes(t))
    .map((t) => TOOLS[t])
    .filter((t): t is NonNullable<typeof t> => Boolean(t))
    .map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }))

  const system = await buildSystemPrompt(agent)
  const convo: NormalizedMessage[] = messages.map((m) =>
    m.role === "user"
      ? { role: "user", content: m.content }
      : { role: "assistant", text: m.content, toolCalls: [] }
  )

  const approvals: PendingApproval[] = []
  const actions: ExecutedAction[] = []
  let inputTokens = 0
  let outputTokens = 0
  let finalText = ""

  const model = getModel()
  const provider = getProvider()
  const startedAt = Date.now()

  try {
    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await provider.chat({
        model,
        system,
        messages: convo,
        tools: grantedTools,
        maxTokens: MAX_OUTPUT_TOKENS,
      })

      inputTokens += response.usage.inputTokens
      outputTokens += response.usage.outputTokens

      if (response.text) finalText = response.text

      if (response.stopReason !== "tool_use" || response.toolCalls.length === 0) break

      convo.push({ role: "assistant", text: response.text, toolCalls: response.toolCalls })

      const toolResults: NormalizedToolResult[] = []

      for (const use of response.toolCalls) {
        const auth = authorizeTool(agent, use.name)

        if (auth.decision === "deny") {
          toolResults.push({ toolCallId: use.id, isError: true, content: `Blocked: ${auth.reason}` })
          actions.push({ capability: use.name, status: "blocked", error: auth.reason })
          continue
        }

        const tool = TOOLS[use.name]!

        if (!tool.capability) {
          const result = await executeReadTool(use.name, use.input, orgId)
          toolResults.push({ toolCallId: use.id, isError: false, content: JSON.stringify(result) })
          continue
        }

        if (auth.decision === "approve") {
          const capability = tool.capability
          const def = getCapability(capability)
          const validated = def?.validate(use.input)
          if (!validated?.ok) {
            toolResults.push({
              toolCallId: use.id,
              isError: true,
              content: `Invalid input: ${validated?.error ?? "unknown"}`,
            })
            continue
          }

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const db = createServiceClient() as any
          const summary = def!.summarize(validated.value)
          const { data: row } = await db
            .from("ai_approvals")
            .insert({
              org_id: orgId,
              agent_id: agent.id,
              agent_key: agentKey,
              capability,
              proposed_action: validated.value as Record<string, unknown>,
              summary,
            })
            .select("id")
            .single()

          approvals.push({ id: row?.id ?? "", capability, summary })
          toolResults.push({
            toolCallId: use.id,
            isError: false,
            content: `Queued for the owner to approve: ${summary}. It has NOT happened yet.`,
          })
          continue
        }

        const outcome = await executeAction({
          orgId,
          capability: tool.capability,
          input: use.input,
          actor: "agent",
          actorRef: `${agentKey}:${userId}`,
        })
        actions.push({
          capability: tool.capability,
          status: outcome.status,
          ...(outcome.error ? { error: outcome.error } : {}),
        })
        toolResults.push({
          toolCallId: use.id,
          isError: outcome.status !== "success",
          content:
            outcome.status === "success"
              ? JSON.stringify(outcome.result ?? {})
              : `Failed: ${outcome.error ?? outcome.status}`,
        })
      }

      convo.push({ role: "tool_results", results: toolResults })
    }

    const costUsd = estimateCostUsd(model, inputTokens, outputTokens)
    await recordRequest({
      orgId,
      agentKey,
      model,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs: Date.now() - startedAt,
      status: "completed",
    })
    await addSpend(orgId, costUsd, Number(budget.current_spend_usd))

    return {
      ok: true,
      text: finalText || "I wasn't able to produce a response for that.",
      approvals,
      actions,
      usage: { inputTokens, outputTokens, costUsd },
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI request failed"
    Sentry.captureException(err, { tags: { agent: agentKey }, extra: { orgId } })

    const costUsd = estimateCostUsd(model, inputTokens, outputTokens)
    await recordRequest({
      orgId,
      agentKey,
      model,
      inputTokens,
      outputTokens,
      costUsd,
      durationMs: Date.now() - startedAt,
      status: "failed",
      error: message,
    })

    return {
      ok: false,
      text: "",
      approvals,
      actions,
      usage: { inputTokens, outputTokens, costUsd },
      refusal: "The AI service is unavailable right now. Please try again in a moment.",
    }
  }
}

export type ApprovalFailure = "not_found" | "decided" | "expired" | "blocked" | "failed"

/**
 * Runs a queued approval after an admin accepts it. The caller must already have
 * checked the user may decide (canDecideApprovals).
 *
 * Order matters: re-authorise → claim → execute → record. The claim is a single
 * conditional update, so an approve racing a reject (or a double-click) can only
 * ever have one winner, and nothing runs until this request has won.
 */
export async function executeApproval(params: {
  approvalId: string
  orgId: string
  userId: string
}): Promise<{ ok: boolean; error?: string; failure?: ApprovalFailure }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: approval } = await db
    .from("ai_approvals")
    .select("id, org_id, agent_key, capability, proposed_action, status, expires_at")
    .eq("id", params.approvalId)
    .eq("org_id", params.orgId)
    .maybeSingle()

  if (!approval) return { ok: false, error: "Approval not found", failure: "not_found" }
  if (approval.status !== "pending") {
    return { ok: false, error: "This request was already decided", failure: "decided" }
  }

  // The proposal was authorised against the agent as it was then. If it has since
  // been paused or had the tool revoked, the approval must not run. It stays
  // pending so the admin can resume the agent or reject it.
  const agentKey = String(approval.agent_key)
  const agent = isAgentKey(agentKey) ? await getAgent(params.orgId, agentKey) : null
  const auth = authorizeApprovedAction(agent, approval.capability)
  if (auth.decision !== "allow") {
    await logBlocked(
      params.orgId,
      approval.capability,
      approval.proposed_action,
      "agent",
      `${agentKey}:approval:${approval.id}`,
      auth.reason
    )
    return { ok: false, error: auth.reason, failure: "blocked" }
  }

  const now = new Date().toISOString()
  const { data: claimed } = await db
    .from("ai_approvals")
    .update({ status: "approved", decided_by: params.userId, decided_at: now })
    .eq("id", approval.id)
    .eq("org_id", params.orgId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .select("id")
    .maybeSingle()

  if (!claimed) {
    // Lost the race, or it expired between the read and the claim.
    if (new Date(approval.expires_at) <= new Date()) {
      await db
        .from("ai_approvals")
        .update({ status: "expired" })
        .eq("id", approval.id)
        .eq("status", "pending")
      return { ok: false, error: "This request expired", failure: "expired" }
    }
    return { ok: false, error: "This request was already decided", failure: "decided" }
  }

  const outcome = await executeAction({
    orgId: params.orgId,
    capability: approval.capability,
    input: approval.proposed_action,
    actor: "agent",
    actorRef: `${agentKey}:approved-by:${params.userId}`,
    idempotencyKey: `approval:${approval.id}`,
  })

  const succeeded = outcome.status === "success" || outcome.status === "duplicate"
  const error = succeeded ? null : (outcome.error ?? "The action could not be completed")

  // The decision stands either way; the outcome is recorded beside it so a failed
  // send is never shown as if it happened.
  await db
    .from("ai_approvals")
    .update({
      executed_at: new Date().toISOString(),
      execution_status: succeeded ? "succeeded" : "failed",
      execution_error: error,
    })
    .eq("id", approval.id)

  if (succeeded) return { ok: true }
  return { ok: false, error: error!, failure: "failed" }
}
