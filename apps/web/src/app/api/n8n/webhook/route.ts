import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { toExecutionStatus } from "@/lib/n8n"
import { sendEmail, APP_URL } from "@/lib/resend"
import { WorkflowErrorEmail } from "@/emails/workflow-error"

// n8n calls this URL when a workflow execution finishes.
// Configure in each n8n workflow: add an HTTP Request node at the end, or use
// n8n's built-in "On workflow error" trigger pointing to this endpoint.
//
// Security: n8n sends X-N8N-Signature header (HMAC-SHA256 of body using N8N_WEBHOOK_SECRET).
// If N8N_WEBHOOK_SECRET is not set, the endpoint accepts all requests (dev only).

interface N8nWebhookPayload {
  workflowId: string
  executionId: string
  workflowName?: string
  status: string
  startedAt?: string
  stoppedAt?: string
  durationMs?: number
  error?: string | null
  /** Optional: org context passed from n8n workflow variable */
  orgId?: string
}

async function verifySignature(req: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (!secret) return true // Skip verification if not configured

  const signature = req.headers.get("x-n8n-signature")
  if (!signature) return false

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"]
  )

  const sigBytes = Buffer.from(signature.replace("sha256=", ""), "hex")
  return crypto.subtle.verify("HMAC", key, sigBytes, encoder.encode(body))
}

export async function POST(req: NextRequest) {
  const body = await req.text()

  const valid = await verifySignature(req, body)
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: N8nWebhookPayload
  try {
    payload = JSON.parse(body) as N8nWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const db = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = db as any

  try {
    // Find the automation row that owns this n8n workflow
    const { data: automation } = (await any
      .from("automations")
      .select("id, org_id, name")
      .eq("n8n_workflow_id", payload.workflowId)
      .maybeSingle()) as {
      data: { id: string; org_id: string; name: string } | null
    }

    // Fall back to payload orgId if no automation row exists yet
    const orgId = automation?.org_id ?? payload.orgId
    if (!orgId) {
      console.warn("[n8n-webhook] No org found for workflow", payload.workflowId)
      return NextResponse.json({ received: true, warning: "No org found for this workflow" })
    }

    const status = toExecutionStatus(payload.status)
    const startedAt = payload.startedAt ?? new Date().toISOString()
    const finishedAt = payload.stoppedAt ?? new Date().toISOString()

    // Compute duration if not provided
    const durationMs =
      payload.durationMs ??
      (payload.startedAt && payload.stoppedAt
        ? new Date(payload.stoppedAt).getTime() - new Date(payload.startedAt).getTime()
        : null)

    if (automation) {
      // Write execution record
      await any.from("workflow_executions").insert({
        org_id: orgId,
        automation_id: automation.id,
        n8n_execution_id: payload.executionId,
        status,
        trigger_data: {},
        result_data: {},
        error: payload.error ?? null,
        retry_count: 0,
        started_at: startedAt,
        finished_at: finishedAt,
        duration_ms: durationMs,
      })

      // Update last_run_at and status on the automation row
      await any.from("automations").update({
        last_run_at: finishedAt,
        status: status === "failed" ? "error" : "active",
        updated_at: finishedAt,
      }).eq("id", automation.id)
    }

    // Send error alert email if the execution failed
    if (status === "failed" && payload.error) {
      const { data: org } = (await any
        .from("organizations")
        .select("name")
        .eq("id", orgId)
        .maybeSingle()) as { data: { name: string } | null }

      // Get org admin email
      const { data: member } = (await any
        .from("organization_members")
        .select("user_id")
        .eq("org_id", orgId)
        .eq("role", "CLIENT_ADMIN")
        .maybeSingle()) as { data: { user_id: string } | null }

      if (member) {
        const { data: { user } } = await db.auth.admin.getUserById(member.user_id)
        if (user?.email) {
          await sendEmail({
            to: user.email,
            subject: `Automation failed: ${automation?.name ?? payload.workflowName ?? "Unknown"}`,
            template: "workflow-error",
            orgId,
            react: WorkflowErrorEmail({
              orgName: org?.name ?? "Your organization",
              automationName: automation?.name ?? payload.workflowName ?? "Unknown automation",
              errorMessage: payload.error,
              occurredAt: new Date(finishedAt).toLocaleString("en-US", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" }) + " UTC",
              automationUrl: `${APP_URL}/portal/dashboard`,
            }),
          })
        }
      }
    }

    return NextResponse.json({ received: true, status })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing failed"
    console.error("[n8n-webhook]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
