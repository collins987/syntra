import { createHash } from "crypto"
import type { RedactedLead } from "@/lib/leads/redact"

// Stable SHA-256 hash of the exact input the AI sees + the analysis
// version. Two calls with the same hash return the cached analysis without
// a provider round-trip; a prompt or schema bump (ANALYSIS_VERSION change)
// invalidates every cached analysis without a destructive DB wipe.
//
// Correctness depends on serialization being stable: field order is fixed
// by the explicit object below, not by Object.keys(), and the version string
// is appended as a sentinel line so a cosmetic change in RedactedLead's
// shape forces every org to re-analyze.

export const ANALYSIS_VERSION = "prompt-v1+schema-v1"

export function hashAnalysisInput(redacted: RedactedLead, version: string = ANALYSIS_VERSION): string {
  // Explicit field order — do NOT replace with JSON.stringify(redacted),
  // which depends on property-insertion order and would silently drift.
  const payload = [
    `version:${version}`,
    `email_domain:${redacted.email_domain ?? ""}`,
    `first_name:${redacted.first_name ?? ""}`,
    `company:${redacted.company ?? ""}`,
    `industry:${redacted.industry ?? ""}`,
    `revenue:${redacted.revenue ?? ""}`,
    `interested_service:${redacted.interested_service ?? ""}`,
    `source:${redacted.source ?? ""}`,
    `audit_challenge:${redacted.audit_challenge ?? ""}`,
    `created_at:${redacted.created_at}`,
  ].join("\n")
  return createHash("sha256").update(payload, "utf8").digest("hex")
}
