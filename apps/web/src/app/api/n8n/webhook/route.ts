import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"
import { toExecutionStatus } from "@/lib/n8n"
import { sendEmail, APP_URL } from "@/lib/resend"
import { verifyTimestampedSignature } from "@/lib/auth/secrets"
import { WorkflowErrorEmail } from "@/emails/workflow-error"

// n8n calls this when a workflow execution finishes.
// See SECURITY_REMEDIATION_PLAN.md §2 (F-02) — §6 has the n8n signing node.
//
// Every request must carry:
//   x-syntra-timestamp: <unix seconds>
//   x-syntra-signature: sha256=<hex HMAC-SHA256(N8N_WEBHOOK_SECRET, "<timestamp>.<raw body>")>
//
// Fails closed: with no secret configured, every request is refused. Otherwise
// anyone could forge executions and send "automation failed" emails to clients
// from SYNTRA's real sender.

const MAX_BODY_BYTES = 64 * 1024
const MAX_ERROR_CHARS = 1000

interface N8nWebhookPayload {
  workflowId: string
  executionId: string
  workflowName?: string
  status: string
  startedAt?: string | null
  stoppedAt?: string | null
  durationMs?: number | null
  error?: string | null
}

function parsePayload(raw: string): N8nWebhookPayload | null {
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (!value || typeof value !== "object") return null
  const p = value as Record<string, unknown>
  const id = (v: unknown) => typeof v === "string" && v.length > 0 && v.length <= 128
  if (!id(p["workflowId"]) || !id(p["executionId"]) || typeof p["status"] !== "string") {
    return null
  }
  return p as unknown as N8nWebhookPayload
}

function validDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export async function POST(req: NextRequest) {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) {
    return NextResponse.json({ error: "Webhook is not configured" }, { status: 503 })
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0)
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }
  const rawBody = await req.text()
  if (Buffer.byteLength(rawBody) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 })
  }

  const check = verifyTimestampedSignature({
    secret,
    rawBody,
    timestamp: req.headers.get("x-syntra-timestamp"),
    signature: req.headers.get("x-syntra-signature"),
  })
  if (!check.ok) {
    console.warn("[n8n-webhook] rejected:", check.reason)
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  const payload = parsePayload(rawBody)
  if (!payload) {
    return NextResponse.json(
      { error: "workflowId, executionId and status are required" },
      { status: 400 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  try {
    // The org is only ever derived from the automation that owns this workflow —
    // never from the payload, which would let a caller target any org.
    const { data: automation } = (await db
      .from("automations")
      .select("id, org_id, name")
      .eq("n8n_workflow_id", payload.workflowId)
      .maybeSingle()) as { data: { id: string; org_id: string; name: string } | null }

    if (!automation) {
      console.warn("[n8n-webhook] unknown workflow", payload.workflowId)
      return NextResponse.json({ received: true, ignored: "Unknown workflow" }, { status: 202 })
    }

    const status = toExecutionStatus(payload.status)
    const startedAt = validDate(payload.startedAt) ?? new Date().toISOString()
    const finishedAt = validDate(payload.stoppedAt) ?? new Date().toISOString()
    const durationMs =
      typeof payload.durationMs === "number" && payload.durationMs >= 0
        ? Math.round(payload.durationMs)
        : Math.max(0, new Date(finishedAt).getTime() - new Date(startedAt).getTime())
    const errorText =
      typeof payload.error === "string" && payload.error
        ? payload.error.slice(0, MAX_ERROR_CHARS)
        : null

    // Idempotency: the unique index on n8n_execution_id (migration 011) makes a
    // retried or replayed event a no-op — no second row and, crucially, no second email.
    const { error: insertError } = await db.from("workflow_executions").insert({
      org_id: automation.org_id,
      automation_id: automation.id,
      n8n_execution_id: payload.executionId,
      status,
      trigger_data: {},
      result_data: {},
      error: errorText,
      retry_count: 0,
      started_at: startedAt,
      finished_at: finishedAt,
      duration_ms: durationMs,
    })

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        return NextResponse.json({ received: true, duplicate: true })
      }
      throw insertError
    }

    await db
      .from("automations")
      .update({
        last_run_at: finishedAt,
        status: status === "failed" ? "error" : "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", automation.id)

    if (status === "failed") {
      await alertAdmins(db, automation, errorText ?? "The workflow reported an error", finishedAt)
    }

    return NextResponse.json({ received: true, status })
  } catch (err) {
    Sentry.captureException(err)
    console.error("[n8n-webhook]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

/** Every admin is told — a failure must never depend on which single admin was found. */
async function alertAdmins(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  automation: { id: string; org_id: string; name: string },
  errorMessage: string,
  finishedAt: string
): Promise<void> {
  const [{ data: org }, { data: admins }] = (await Promise.all([
    db.from("organizations").select("name").eq("id", automation.org_id).maybeSingle(),
    db
      .from("organization_members")
      .select("user_id")
      .eq("org_id", automation.org_id)
      .eq("role", "CLIENT_ADMIN"),
  ])) as [{ data: { name: string } | null }, { data: Array<{ user_id: string }> | null }]

  if (!admins?.length) {
    Sentry.captureMessage(
      `[n8n-webhook] failure alert for org ${automation.org_id} has no admin to notify`,
      "warning"
    )
    return
  }

  const occurredAt =
    new Date(finishedAt).toLocaleString("en-US", {
      timeZone: "UTC",
      dateStyle: "medium",
      timeStyle: "short",
    }) + " UTC"

  await Promise.all(
    admins.map(async ({ user_id }) => {
      const {
        data: { user },
      } = await db.auth.admin.getUserById(user_id)
      if (!user?.email) return
      await sendEmail({
        to: user.email,
        subject: `Automation failed: ${automation.name}`,
        template: "workflow-error",
        orgId: automation.org_id,
        react: WorkflowErrorEmail({
          orgName: org?.name ?? "Your organization",
          automationName: automation.name,
          errorMessage,
          occurredAt,
          automationUrl: `${APP_URL}/portal/automations`,
        }),
      })
    })
  )
}
