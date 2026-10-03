import { createServiceClient } from "@/lib/supabase/service"
import type { LeadScoringPolicy, LeadTier } from "@syntra/db"

// ── Deterministic Lead Intelligence ─────────────────────────────────────────
//
// This file is the ONLY code permitted to compute `leads.score`/`leads.tier`.
// It has no import of anything AI-related and never will — the separation
// from the future AI intelligence layer (ai_score/ai_reasoning, not built
// yet) is enforced by this module's own boundary, not just a comment. See
// LEAD_INTELLIGENCE_V2_PLAN.md for the full design.
//
// SCORE IS NOT: sales priority, routing priority, automatic-assignment input,
// predicted conversion probability, AI judgment, or revenue prediction. It is
// a qualification/intelligence signal only — "how many objective points does
// SYNTRA's current policy award this lead, and why."
//
// Tiers represent accumulated QUALIFICATION EVIDENCE, not intent presence or
// absence. A Tier D lead can still contain real, meaningful intent — e.g. a
// lead with only an explicit interested_service signal (18 points) lands in
// D not because it lacks intent, but because the policy currently requires
// more corroborating evidence than one signal provides to reach C (40). This
// is an accepted, deliberate consequence of the approved policy, not a bug —
// do not add hidden minimum-score rules or intent overrides to work around it.

export const INTERESTED_SERVICES = ["sites", "flow", "growth", "os"] as const

export interface LeadSignals {
  interested_service: string | null
  source: string | null
  revenue: string | null // from audit_answers.revenue, when present
  industry: string | null // from audit_answers.industry, when present
  created_at: string
  company: string | null
}

export interface ScoreResult {
  score: number
  tier: LeadTier
  reasons: string[]
}

function tierFor(score: number): LeadTier {
  if (score >= 80) return "A"
  if (score >= 60) return "B"
  if (score >= 40) return "C"
  return "D"
}

/** Generic rule evaluator — no individual business rule is hardcoded here or
 *  anywhere else. Adding/reweighting a signal is a `lead_scoring_policies`
 *  row change, never a deploy. */
function evaluateRule(rule: LeadScoringPolicy, lead: LeadSignals): boolean {
  const fieldValue = fieldValueFor(rule.field, lead)

  switch (rule.operator) {
    case "equals":
      return fieldValue !== null && fieldValue === rule.value
    case "in":
      return fieldValue !== null && Array.isArray(rule.value) && rule.value.includes(fieldValue)
    case "not_null":
      return fieldValue !== null && fieldValue !== ""
    case "range": {
      if (rule.field !== "recency") return false
      const { min, max } = (rule.value as { min: number; max: number | null }) ?? {}
      const ageDays = (Date.now() - new Date(lead.created_at).getTime()) / 86_400_000
      return ageDays >= min && (max === null || max === undefined || ageDays <= max)
    }
    default:
      return false
  }
}

function fieldValueFor(field: LeadScoringPolicy["field"], lead: LeadSignals): string | null {
  switch (field) {
    case "interested_service":
      return lead.interested_service
    case "source":
      return lead.source
    case "revenue":
      return lead.revenue
    case "industry":
      return lead.industry
    case "company":
      return lead.company
    case "recency":
      return null // handled structurally by the "range" operator above
    default:
      return null
  }
}

/** Pure — same input + same policy always produces the same output. No
 *  randomness, no model call, independently recalculable by an admin at any
 *  time without side effects. */
export function scoreLead(lead: LeadSignals, policy: LeadScoringPolicy[]): ScoreResult {
  const matched = policy
    .filter((r) => r.enabled && evaluateRule(r, lead))
    .sort((a, b) => b.points - a.points)

  const score = Math.min(matched.reduce((n, r) => n + r.points, 0), 100)
  const reasons = matched
    .map((r) => resolveReason(r.explanation, lead))
    .filter((text) => text.length > 0) // the 8–30 day recency rule is deliberately silent — too weak to state

  return { score, tier: tierFor(score), reasons }
}

// ── Approved initial policy (seed only — fully configurable per org) ───────
// Exact values approved in LEAD_INTELLIGENCE_V2_PLAN.md. Nothing here is
// hardcoded into evaluateRule/scoreLead above — this is just the data these
// functions are generic over, seeded once per org on first use.
const APPROVED_SEED_POLICY: Array<Omit<LeadScoringPolicy, "id" | "org_id" | "created_at">> = [
  {
    field: "interested_service",
    operator: "equals",
    value: "os",
    points: 25,
    category: "intent",
    explanation: "Interested in the complete SYNTRA platform (OS).",
    enabled: true,
  },
  {
    field: "interested_service",
    operator: "in",
    value: ["sites", "flow", "growth"],
    points: 18,
    category: "intent",
    explanation: "Interested in Syntra {service}.", // resolved per-lead at read time, see note below
    enabled: true,
  },
  {
    field: "source",
    operator: "equals",
    value: "audit",
    points: 15,
    category: "intent",
    explanation: "Came from the audit funnel.",
    enabled: true,
  },
  { field: "revenue", operator: "equals", value: "under-10k", points: 5, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "10k-50k", points: 10, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "50k-250k", points: 15, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "250k-1m", points: 20, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "over-1m", points: 25, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  {
    field: "industry",
    operator: "in",
    // Seeded from the same high-value list already proven out in
    // api/audit/route.ts's scoreAuditLead — not a new, invented list.
    value: ["ecommerce", "saas", "agency", "real-estate", "finance"],
    points: 10,
    category: "qualification",
    explanation: "Industry matches SYNTRA's typical best-fit profile.",
    enabled: true,
  },
  {
    field: "recency",
    operator: "range",
    value: { min: 0, max: 7 },
    points: 5,
    category: "engagement",
    explanation: "Recently submitted.",
    enabled: true,
  },
  {
    field: "recency",
    operator: "range",
    value: { min: 8, max: 30 },
    points: 2,
    category: "engagement",
    explanation: "", // deliberately not surfaced as a reason — too weak to state
    enabled: true,
  },
  {
    field: "company",
    operator: "not_null",
    value: true,
    points: 3,
    category: "completeness",
    explanation: "Company information provided.",
    enabled: true,
  },
]

/** Lazy per-org seeding — identical pattern to ensureAgents() for ai_agents.
 *  A fresh org gets the approved policy on first score computation rather
 *  than requiring every org to be backfilled by the migration itself.
 *
 *  Idempotent under concurrency: two simultaneous first-use calls for the
 *  same new org both see zero existing rows and would otherwise both try to
 *  insert the full policy. Upserting against the (org_id, field, operator,
 *  value) unique index with ignoreDuplicates makes the loser's insert a
 *  no-op instead of a duplicate row, and the final select always returns
 *  the single authoritative set regardless of which call won the race. */
export async function ensureScoringPolicy(orgId: string): Promise<LeadScoringPolicy[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const { data: existing } = await db.from("lead_scoring_policies").select("*").eq("org_id", orgId)
  if (existing && existing.length > 0) return existing as LeadScoringPolicy[]

  await db
    .from("lead_scoring_policies")
    .upsert(
      APPROVED_SEED_POLICY.map((rule) => ({ ...rule, org_id: orgId })),
      { onConflict: "org_id,field,operator,value", ignoreDuplicates: true }
    )

  const { data: seeded } = await db.from("lead_scoring_policies").select("*").eq("org_id", orgId)
  return (seeded ?? []) as LeadScoringPolicy[]
}

/** Resolves the {service} placeholder in the specific-service rule's
 *  explanation to the lead's actual interested_service, without hardcoding
 *  per-service explanation strings into the policy data itself. */
export function resolveReason(reason: string, lead: LeadSignals): string {
  if (!reason.includes("{service}")) return reason
  const label = SERVICE_LABELS[lead.interested_service ?? ""] ?? lead.interested_service ?? ""
  return reason.replace("{service}", label)
}

const SERVICE_LABELS: Record<string, string> = {
  sites: "Syntra Sites",
  flow: "Syntra Flow",
  growth: "Syntra Growth",
  os: "Syntra OS",
}
