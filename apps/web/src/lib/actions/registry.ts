import { sendEmail } from "@/lib/resend"
import { n8n } from "@/lib/n8n"
import { AgentMessageEmail } from "@/emails/agent-message"

// Every capability SYNTRA can execute against the outside world. n8n and the AI
// agents may only ask for these by name — they never hold credentials or call a
// provider directly. See SYNTRA_BUILD_PLAN.md §3 Decision A.

export interface ActionContext {
  orgId: string
  orgName: string
  /** Decrypts an org credential on demand. Returns null when not connected. */
  getCredential: (provider: string) => Promise<string | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any
}

export type Validated<T> = { ok: true; value: T } | { ok: false; error: string }

export interface CapabilityDef<T = Record<string, unknown>> {
  name: string
  description: string
  /** Cannot be undone once executed — permanently capped at Level 1. */
  irreversible: boolean
  /** Provider that must be connected in org_credentials before this can run. */
  requiredCredential?: string
  validate: (input: unknown) => Validated<T>
  /** One line a business owner can approve or reject without context. */
  summarize: (input: T) => string
  execute: (input: T, ctx: ActionContext) => Promise<Record<string, unknown>>
}

function str(obj: Record<string, unknown>, key: string): string | null {
  const v = obj[key]
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null
}

function asObject(input: unknown): Record<string, unknown> | null {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)
    : null
}

// ── email.send ────────────────────────────────────────────────────────────────

interface EmailSendInput {
  to: string
  subject: string
  body: string
}

const emailSend: CapabilityDef<EmailSendInput> = {
  name: "email.send",
  description: "Send an email to a named recipient.",
  irreversible: true,
  validate(input) {
    const o = asObject(input)
    if (!o) return { ok: false, error: "Expected an object" }
    const to = str(o, "to")
    const subject = str(o, "subject")
    const body = str(o, "body")
    if (!to) return { ok: false, error: "`to` is required" }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { ok: false, error: "`to` is not a valid email" }
    if (!subject) return { ok: false, error: "`subject` is required" }
    if (!body) return { ok: false, error: "`body` is required" }
    return { ok: true, value: { to, subject, body } }
  },
  summarize: (i) => `Send an email to ${i.to} with the subject "${i.subject}"`,
  async execute(input, ctx) {
    const result = await sendEmail({
      to: input.to,
      subject: input.subject,
      template: "agent-message",
      orgId: ctx.orgId,
      react: AgentMessageEmail({
        subject: input.subject,
        body: input.body,
        orgName: ctx.orgName,
      }),
    })
    if (!result.ok) throw new Error("Email provider rejected the message")
    return { delivered: true, id: result.id ?? null }
  },
}

// ── crm.upsert ────────────────────────────────────────────────────────────────

interface CrmUpsertInput {
  email: string
  name: string | null
  company: string | null
  source: string | null
}

const crmUpsert: CapabilityDef<CrmUpsertInput> = {
  name: "crm.upsert",
  description: "Create or update a contact record in the client's lead table.",
  irreversible: false,
  validate(input) {
    const o = asObject(input)
    if (!o) return { ok: false, error: "Expected an object" }
    const email = str(o, "email")
    if (!email) return { ok: false, error: "`email` is required" }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "`email` is not valid" }
    return {
      ok: true,
      value: {
        email,
        name: str(o, "name"),
        company: str(o, "company"),
        source: str(o, "source") ?? "automation",
      },
    }
  },
  summarize: (i) => `Add or update ${i.name ?? i.email} in your contacts`,
  async execute(input, ctx) {
    const { data: existing } = await ctx.db
      .from("leads")
      .select("id")
      .eq("org_id", ctx.orgId)
      .eq("email", input.email)
      .maybeSingle()

    if (existing?.id) {
      const { error } = await ctx.db
        .from("leads")
        .update({
          ...(input.name ? { name: input.name } : {}),
          ...(input.company ? { company: input.company } : {}),
        })
        .eq("id", existing.id)
      if (error) throw new Error(error.message)
      return { leadId: existing.id, created: false }
    }

    const { data, error } = await ctx.db
      .from("leads")
      .insert({
        org_id: ctx.orgId,
        email: input.email,
        name: input.name,
        company: input.company,
        source: input.source,
      })
      .select("id")
      .single()
    if (error) throw new Error(error.message)
    return { leadId: data.id, created: true }
  },
}

// ── notify.slack ──────────────────────────────────────────────────────────────

interface SlackNotifyInput {
  text: string
}

const notifySlack: CapabilityDef<SlackNotifyInput> = {
  name: "notify.slack",
  description: "Post a message to the client's connected Slack channel.",
  irreversible: true,
  requiredCredential: "slack",
  validate(input) {
    const o = asObject(input)
    if (!o) return { ok: false, error: "Expected an object" }
    const text = str(o, "text")
    if (!text) return { ok: false, error: "`text` is required" }
    if (text.length > 3000) return { ok: false, error: "`text` exceeds 3000 characters" }
    return { ok: true, value: { text } }
  },
  summarize: (i) => `Post to Slack: "${i.text.slice(0, 80)}${i.text.length > 80 ? "…" : ""}"`,
  async execute(input, ctx) {
    const webhookUrl = await ctx.getCredential("slack")
    if (!webhookUrl) throw new Error("Slack is not connected for this organisation")
    if (!webhookUrl.startsWith("https://hooks.slack.com/")) {
      throw new Error("Stored Slack credential is not a Slack webhook URL")
    }
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: input.text }),
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) throw new Error(`Slack returned ${res.status}`)
    return { posted: true }
  },
}

// ── workflow.toggle ───────────────────────────────────────────────────────────

interface WorkflowToggleInput {
  automationId: string
  active: boolean
}

const workflowToggle: CapabilityDef<WorkflowToggleInput> = {
  name: "workflow.toggle",
  description: "Turn one of the client's automations on or off.",
  irreversible: false,
  validate(input) {
    const o = asObject(input)
    if (!o) return { ok: false, error: "Expected an object" }
    const automationId = str(o, "automationId")
    if (!automationId) return { ok: false, error: "`automationId` is required" }
    if (typeof o["active"] !== "boolean") return { ok: false, error: "`active` must be a boolean" }
    return { ok: true, value: { automationId, active: o["active"] } }
  },
  summarize: (i) => `Turn the automation ${i.active ? "on" : "off"}`,
  async execute(input, ctx) {
    // Scoped by org_id so one org can never toggle another's workflow.
    const { data: automation } = await ctx.db
      .from("automations")
      .select("id, n8n_workflow_id, name")
      .eq("org_id", ctx.orgId)
      .eq("id", input.automationId)
      .maybeSingle()

    if (!automation) throw new Error("Automation not found for this organisation")
    if (!automation.n8n_workflow_id) throw new Error("Automation is not linked to a workflow")

    await n8n.setActive(automation.n8n_workflow_id, input.active)

    const { error } = await ctx.db
      .from("automations")
      .update({ status: input.active ? "active" : "paused" })
      .eq("id", automation.id)
    if (error) throw new Error(error.message)

    return { automationId: automation.id, name: automation.name, active: input.active }
  },
}

// ── Registry ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CAPABILITIES: Record<string, CapabilityDef<any>> = {
  [emailSend.name]: emailSend,
  [crmUpsert.name]: crmUpsert,
  [notifySlack.name]: notifySlack,
  [workflowToggle.name]: workflowToggle,
}

export const CAPABILITY_NAMES = Object.keys(CAPABILITIES)

export function getCapability(name: string): CapabilityDef | undefined {
  return CAPABILITIES[name]
}
