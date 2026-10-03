import type { Lead } from "@syntra/db"

// Approved projection for the AI Lead Intelligence prompt. The redactor is the
// one place that decides what crosses the SYNTRA-to-provider boundary; the
// prompt builder consumes its output and nothing else. If a field is not
// returned here, it cannot reach the AI provider — enforce by never passing
// `lead` directly into any provider-facing code.
//
// Phase 1f-α adds `AI_PIN_SOURCES` and `snapshotPinFields` beside the
// redactor so the stale-input conditional UPDATE in analyze-lead.ts pins the
// exact same source attributes the redactor reads. The two must stay in
// lockstep; the review-checklist comment in this file plus the
// qa:ai-lead-parser grep assertion are the two mechanisms that keep them so.
//
// See AI_LEAD_INTELLIGENCE_PLAN.md §I ("Security / Multi-Tenant Architecture")
// and §13 ("Privacy and Data Boundaries"). Changes to this projection are a
// product/legal decision, not a code-review one.

export interface RedactedLead {
  email_domain: string | null
  first_name: string | null
  company: string | null
  industry: string | null
  revenue: string | null
  interested_service: string | null
  source: string | null
  // Only the free-text challenge the lead themselves wrote in the audit form.
  // We deliberately do NOT send the structured industry/revenue audit answers
  // (duplicates of top-level fields) or any internal audit_report.
  audit_challenge: string | null
  created_at: string
}

/** Deny-by-default projection. Only the fields enumerated here are returned;
 *  the rest of the Lead row (email local-part, phone, metadata, assignment
 *  info, deterministic score/tier, ai_* audit metadata, crm_id, status,
 *  campaign_id, updated_at) never crosses this boundary. */
export function redactLeadForPrompt(lead: Lead): RedactedLead {
  return {
    email_domain: emailDomainOf(lead.email),
    first_name: firstNameOf(lead.name),
    company: nonEmpty(lead.company),
    industry: nonEmpty(auditString(lead, "industry")),
    revenue: nonEmpty(auditString(lead, "revenue")),
    interested_service: lead.interested_service,
    source: nonEmpty(lead.source),
    audit_challenge: nonEmpty(auditString(lead, "challenge")),
    created_at: lead.created_at,
  }
}

/** Human-readable LEAD DATA block for the system prompt. Keep the format
 *  stable — it participates in the input hash, so a cosmetic change here
 *  will invalidate every cached analysis for every org. */
export function formatRedactedLead(r: RedactedLead): string {
  const line = (k: string, v: string | null) => `- ${k}: ${v ?? "null"}`
  return [
    "LEAD DATA:",
    line("email_domain", r.email_domain),
    line("first_name", r.first_name),
    line("company", r.company),
    line("industry", r.industry),
    line("revenue", r.revenue),
    line("interested_service", r.interested_service),
    line("source", r.source),
    line("audit_challenge", r.audit_challenge),
    line("created_at", r.created_at),
  ].join("\n")
}

function emailDomainOf(email: string): string | null {
  const at = email.lastIndexOf("@")
  if (at < 0 || at === email.length - 1) return null
  return email.slice(at + 1).toLowerCase()
}

function firstNameOf(name: string | null): string | null {
  if (!name) return null
  const first = name.trim().split(/\s+/)[0]
  return first && first.length > 0 ? first : null
}

function nonEmpty(v: string | null | undefined): string | null {
  if (v == null) return null
  const trimmed = v.trim()
  return trimmed.length > 0 ? trimmed : null
}

function auditString(lead: Lead, key: "industry" | "revenue" | "challenge"): string | null {
  const answers = lead.audit_answers as Record<string, unknown> | null | undefined
  const value = answers?.[key]
  return typeof value === "string" ? value : null
}

// ── Stale-input pin: single source of truth for analyze-lead's WHERE clause ──
//
// Every entry in AI_PIN_SOURCES names a raw lead attribute path that
// redactLeadForPrompt() reads. The conditional UPDATE in analyze-lead.ts
// pins each of these to its snapshot value. Changing the redactor's inputs
// without updating this list is a correctness bug (either a stale analysis
// could silently overwrite newer state, or an unrelated change could
// spuriously invalidate a pending analysis). The grep-level assertion in
// qa:ai-lead-parser catches divergence between the two.
//
// Column syntax: a plain column name ("email") maps directly to the leads
// column; a path syntax ("audit_answers->>industry") maps to the jsonb
// sub-key via PostgREST's standard operator. snapshotPinFields() returns
// the current values of all nine, null-aware.

export type AiPinSource =
  | "email"
  | "name"
  | "company"
  | "source"
  | "interested_service"
  | "created_at"
  | "audit_answers->>industry"
  | "audit_answers->>revenue"
  | "audit_answers->>challenge"

export const AI_PIN_SOURCES: readonly AiPinSource[] = [
  "email",
  "name",
  "company",
  "source",
  "interested_service",
  "created_at",
  "audit_answers->>industry",
  "audit_answers->>revenue",
  "audit_answers->>challenge",
] as const

export type AiPinSnapshot = Record<AiPinSource, string | null>

export function snapshotPinFields(lead: Lead): AiPinSnapshot {
  return {
    email: lead.email,
    name: lead.name,
    company: lead.company,
    source: lead.source,
    interested_service: lead.interested_service,
    created_at: lead.created_at,
    "audit_answers->>industry": auditString(lead, "industry"),
    "audit_answers->>revenue": auditString(lead, "revenue"),
    "audit_answers->>challenge": auditString(lead, "challenge"),
  }
}
