import { createServiceClient } from "@/lib/supabase/service"

// Tools an agent may call. Read tools run immediately and are always scoped to
// the caller's org_id. Tools with a `capability` reach the outside world and are
// routed through the Action Gateway by the policy engine — never executed here.

export interface ToolDef {
  name: string
  description: string
  input_schema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
  /** Set when this tool causes a real-world effect. */
  capability?: string
}

export const TOOLS: Record<string, ToolDef> = {
  "site.read": {
    name: "site.read",
    description:
      "List the websites SYNTRA manages for this organisation, with their status and domain.",
    input_schema: { type: "object", properties: {} },
  },

  "content.performance": {
    name: "content.performance",
    description:
      "How many leads the organisation captured over a recent period, broken down by source and score tier. Use this to judge what content is working.",
    input_schema: {
      type: "object",
      properties: {
        days: {
          type: "number",
          description: "Look-back window in days. Defaults to 30, maximum 365.",
        },
      },
    },
  },

  "workflow.read": {
    name: "workflow.read",
    description:
      "List this organisation's automations with status, last run time and how many times each ran this month.",
    input_schema: { type: "object", properties: {} },
  },

  "workflow.diagnose": {
    name: "workflow.diagnose",
    description:
      "Fetch recent failed executions with their error messages, so you can explain what went wrong.",
    input_schema: {
      type: "object",
      properties: {
        automationId: {
          type: "string",
          description: "Optional — restrict to one automation.",
        },
        limit: { type: "number", description: "How many failures to fetch. Default 10, max 50." },
      },
    },
  },

  "data.query": {
    name: "data.query",
    description:
      "Aggregate business data for this organisation. Returns counts and totals, never raw personal records.",
    input_schema: {
      type: "object",
      properties: {
        dataset: {
          type: "string",
          enum: ["leads", "automations", "executions", "revenue"],
          description: "Which dataset to summarise.",
        },
        days: { type: "number", description: "Look-back window in days. Default 30, max 365." },
      },
      required: ["dataset"],
    },
  },

  // ── Action-backed tools ────────────────────────────────────────────────────

  "email.send": {
    name: "email.send",
    description:
      "Send an email. This reaches a real person and cannot be undone, so it always requires human approval.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address." },
        subject: { type: "string" },
        body: { type: "string", description: "Plain text. Blank lines separate paragraphs." },
      },
      required: ["to", "subject", "body"],
    },
    capability: "email.send",
  },

  "workflow.toggle": {
    name: "workflow.toggle",
    description: "Turn one of this organisation's automations on or off.",
    input_schema: {
      type: "object",
      properties: {
        automationId: { type: "string" },
        active: { type: "boolean" },
      },
      required: ["automationId", "active"],
    },
    capability: "workflow.toggle",
  },

  "notify.slack": {
    name: "notify.slack",
    description:
      "Post a message to the organisation's connected Slack channel. Cannot be unsent.",
    input_schema: {
      type: "object",
      properties: { text: { type: "string" } },
      required: ["text"],
    },
    capability: "notify.slack",
  },
}

function clampDays(input: Record<string, unknown>, fallback = 30): number {
  const raw = typeof input["days"] === "number" ? input["days"] : fallback
  return Math.min(Math.max(Math.round(raw), 1), 365)
}

function since(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString()
}

/**
 * Runs a read-only tool. Every query filters on org_id — an agent cannot reach
 * another organisation's data even if the model asks for it.
 */
export async function executeReadTool(
  name: string,
  rawInput: unknown,
  orgId: string
): Promise<Record<string, unknown>> {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Record<string, unknown>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  switch (name) {
    case "site.read": {
      const { data } = await db
        .from("websites")
        .select("id, domain, status, created_at")
        .eq("org_id", orgId)
      return { websites: data ?? [], count: data?.length ?? 0 }
    }

    case "content.performance": {
      const days = clampDays(input)
      const { data } = await db
        .from("leads")
        .select("source, tier, score, created_at")
        .eq("org_id", orgId)
        .gte("created_at", since(days))

      const rows: Array<{ source: string | null; tier: string | null; score: number }> = data ?? []
      const bySource: Record<string, number> = {}
      const byTier: Record<string, number> = {}
      for (const r of rows) {
        const s = r.source ?? "unknown"
        const t = r.tier ?? "unscored"
        bySource[s] = (bySource[s] ?? 0) + 1
        byTier[t] = (byTier[t] ?? 0) + 1
      }
      const avgScore = rows.length
        ? Math.round(rows.reduce((n, r) => n + (r.score ?? 0), 0) / rows.length)
        : null

      return { periodDays: days, totalLeads: rows.length, bySource, byTier, avgScore }
    }

    case "workflow.read": {
      const { data } = await db
        .from("automations")
        .select("id, name, status, last_run_at, monthly_execution_count, workflow_code")
        .eq("org_id", orgId)
      return { automations: data ?? [], count: data?.length ?? 0 }
    }

    case "workflow.diagnose": {
      const limit = Math.min(
        Math.max(typeof input["limit"] === "number" ? Math.round(input["limit"]) : 10, 1),
        50
      )
      let query = db
        .from("workflow_executions")
        .select("id, automation_id, status, error, started_at, duration_ms")
        .eq("org_id", orgId)
        .eq("status", "failed")
        .order("started_at", { ascending: false })
        .limit(limit)

      const automationId = input["automationId"]
      if (typeof automationId === "string" && automationId) {
        query = query.eq("automation_id", automationId)
      }

      const { data } = await query
      return { failures: data ?? [], count: data?.length ?? 0 }
    }

    case "data.query": {
      const dataset = String(input["dataset"] ?? "")
      const days = clampDays(input)
      const from = since(days)

      if (dataset === "leads") {
        const { data } = await db
          .from("leads")
          .select("tier, status, created_at")
          .eq("org_id", orgId)
          .gte("created_at", from)
        const rows: Array<{ tier: string | null; status: string }> = data ?? []
        const byTier: Record<string, number> = {}
        const byStatus: Record<string, number> = {}
        for (const r of rows) {
          byTier[r.tier ?? "unscored"] = (byTier[r.tier ?? "unscored"] ?? 0) + 1
          byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
        }
        return { periodDays: days, total: rows.length, byTier, byStatus }
      }

      if (dataset === "automations") {
        const { data } = await db
          .from("automations")
          .select("status, monthly_execution_count")
          .eq("org_id", orgId)
        const rows: Array<{ status: string; monthly_execution_count: number }> = data ?? []
        const byStatus: Record<string, number> = {}
        for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
        return {
          total: rows.length,
          byStatus,
          executionsThisMonth: rows.reduce((n, r) => n + (r.monthly_execution_count ?? 0), 0),
        }
      }

      if (dataset === "executions") {
        const { data } = await db
          .from("workflow_executions")
          .select("status, duration_ms, started_at")
          .eq("org_id", orgId)
          .gte("started_at", from)
        const rows: Array<{ status: string; duration_ms: number | null }> = data ?? []
        const finished = rows.filter((r) => r.status === "completed" || r.status === "failed")
        const durations = rows.map((r) => r.duration_ms).filter((d): d is number => d != null)
        return {
          periodDays: days,
          total: rows.length,
          succeeded: rows.filter((r) => r.status === "completed").length,
          failed: rows.filter((r) => r.status === "failed").length,
          successRatePct: finished.length
            ? Math.round((finished.filter((r) => r.status === "completed").length / finished.length) * 100)
            : null,
          avgDurationMs: durations.length
            ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
            : null,
        }
      }

      if (dataset === "revenue") {
        const { data } = await db
          .from("invoices")
          .select("amount_cents, currency, status, created_at")
          .eq("org_id", orgId)
          .eq("status", "paid")
          .gte("created_at", from)
        const rows: Array<{ amount_cents: number; currency: string }> = data ?? []
        return {
          periodDays: days,
          paidInvoices: rows.length,
          totalAmount: rows.reduce((n, r) => n + (r.amount_cents ?? 0), 0) / 100,
          currency: rows[0]?.currency ?? "usd",
        }
      }

      return { error: `Unknown dataset "${dataset}"` }
    }

    default:
      return { error: `Tool "${name}" has no read implementation` }
  }
}
