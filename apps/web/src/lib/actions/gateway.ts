import { createServiceClient } from "@/lib/supabase/service"
import { decryptSecret, hashToken } from "@/lib/crypto"
import { getCapability, type ActionContext } from "./registry"

// The single enforcement point for everything SYNTRA does to the outside world.
// n8n and the AI agents both arrive here; neither can bypass it, because neither
// holds a provider credential. See SYNTRA_BUILD_PLAN.md §3 Decision A.

export type Actor = "agent" | "workflow" | "human" | "system"

export interface ExecuteParams {
  orgId: string
  capability: string
  input: unknown
  actor: Actor
  actorRef?: string | null
  /** Same key + same org = execute once. Required for workflow-initiated calls. */
  idempotencyKey?: string | null
}

export interface ExecuteResult {
  status: "success" | "failed" | "blocked" | "duplicate" | "in_flight"
  result?: Record<string, unknown>
  error?: string
  actionId?: string
}

const UNIQUE_VIOLATION = "23505"

export interface TokenIdentity {
  orgId: string
  tokenId: string
  capabilities: string[]
}

/** Resolves an `Authorization: Bearer <token>` header to an org + capability grant. */
export async function authenticateWorkflowToken(
  authHeader: string | null
): Promise<TokenIdentity | null> {
  if (!authHeader?.startsWith("Bearer ")) return null
  const token = authHeader.slice(7).trim()
  if (!token) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = await db
    .from("workflow_tokens")
    .select("id, org_id, capabilities, revoked_at")
    .eq("token_hash", hashToken(token))
    .maybeSingle()

  if (!data || data.revoked_at) return null

  await db
    .from("workflow_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)

  return { orgId: data.org_id, tokenId: data.id, capabilities: data.capabilities ?? [] }
}

async function buildContext(orgId: string): Promise<ActionContext> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: org } = await db
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .maybeSingle()

  return {
    orgId,
    orgName: org?.name ?? "your organisation",
    db,
    async getCredential(provider: string) {
      const { data } = await db
        .from("org_credentials")
        .select("id, encrypted_value, status")
        .eq("org_id", orgId)
        .eq("provider", provider)
        .eq("status", "active")
        .maybeSingle()

      if (!data) return null
      await db
        .from("org_credentials")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", data.id)

      return decryptSecret(data.encrypted_value)
    },
  }
}

/** Records a refused action. Every refusal is logged — nothing is denied silently. */
export async function logBlocked(
  orgId: string,
  capability: string,
  input: unknown,
  actor: Actor,
  actorRef: string | null,
  reason: string
): Promise<ExecuteResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  await db.from("action_log").insert({
    org_id: orgId,
    actor,
    actor_ref: actorRef,
    capability,
    request: sanitize(input),
    result: {},
    status: "blocked",
    blocked_reason: reason,
  })
  return { status: "blocked", error: reason }
}

/** Keeps obviously sensitive fields out of the audit record. */
function sanitize(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== "object") return {}
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    out[k] = /token|secret|password|key|authorization/i.test(k) ? "[redacted]" : v
  }
  return out
}

export async function executeAction(params: ExecuteParams): Promise<ExecuteResult> {
  const { orgId, capability, input, actor, actorRef = null, idempotencyKey = null } = params

  const def = getCapability(capability)
  if (!def) {
    return logBlocked(orgId, capability, input, actor, actorRef, `Unknown capability "${capability}"`)
  }

  const validated = def.validate(input)
  if (!validated.ok) {
    return logBlocked(orgId, capability, input, actor, actorRef, validated.error)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  // Reserve the idempotency key before running the adapter, so a concurrent
  // retry collides here rather than sending twice.
  let actionId: string | null = null
  if (idempotencyKey) {
    const { data, error } = await db
      .from("action_log")
      .insert({
        org_id: orgId,
        actor,
        actor_ref: actorRef,
        capability,
        request: sanitize(validated.value),
        result: {},
        status: "pending",
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single()

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        const { data: prior } = await db
          .from("action_log")
          .select("id, status, result")
          .eq("idempotency_key", idempotencyKey)
          .maybeSingle()

        if (prior?.status === "pending") {
          return { status: "in_flight", error: "An identical action is already running" }
        }
        return {
          status: "duplicate",
          result: prior?.result ?? {},
          actionId: prior?.id,
        }
      }
      throw new Error(error.message)
    }
    actionId = data.id
  }

  const ctx = await buildContext(orgId)

  if (def.requiredCredential) {
    const cred = await ctx.getCredential(def.requiredCredential)
    if (!cred) {
      const reason = `${def.requiredCredential} is not connected for this organisation`
      if (actionId) {
        await db
          .from("action_log")
          .update({ status: "blocked", blocked_reason: reason })
          .eq("id", actionId)
        return { status: "blocked", error: reason, actionId }
      }
      return logBlocked(orgId, capability, validated.value, actor, actorRef, reason)
    }
  }

  const startedAt = Date.now()
  try {
    const result = await def.execute(validated.value, ctx)
    const durationMs = Date.now() - startedAt

    if (actionId) {
      await db
        .from("action_log")
        .update({ status: "success", result, duration_ms: durationMs })
        .eq("id", actionId)
    } else {
      const { data } = await db
        .from("action_log")
        .insert({
          org_id: orgId,
          actor,
          actor_ref: actorRef,
          capability,
          request: sanitize(validated.value),
          result,
          status: "success",
          duration_ms: durationMs,
        })
        .select("id")
        .single()
      actionId = data?.id ?? null
    }

    return { status: "success", result, ...(actionId ? { actionId } : {}) }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Action failed"
    const durationMs = Date.now() - startedAt

    if (actionId) {
      await db
        .from("action_log")
        .update({ status: "failed", result: { error: message }, duration_ms: durationMs })
        .eq("id", actionId)
    } else {
      await db.from("action_log").insert({
        org_id: orgId,
        actor,
        actor_ref: actorRef,
        capability,
        request: sanitize(validated.value),
        result: { error: message },
        status: "failed",
        duration_ms: durationMs,
      })
    }

    return { status: "failed", error: message, ...(actionId ? { actionId } : {}) }
  }
}
