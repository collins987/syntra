// Phase 1b unit tests — pure, no DB, no provider. Run: pnpm qa:ai-lead-parser
//
// Covers:
//   parseReasoning: happy path + every malformation shape we care about
//   redactLeadForPrompt: approved projection, blocked fields never leak
//   hashAnalysisInput: stability + version sensitivity + field sensitivity
//   analyze-lead invariant: the orchestrator source MUST NOT write score/tier

import { readFileSync } from "fs"
import { resolve } from "path"
import {
  parseReasoning,
  MalformedResponseError,
} from "../../src/lib/ai/functions/parse-reasoning"
import {
  redactLeadForPrompt,
  formatRedactedLead,
  snapshotPinFields,
  AI_PIN_SOURCES,
  type RedactedLead,
} from "../../src/lib/leads/redact"
import { hashAnalysisInput, ANALYSIS_VERSION } from "../../src/lib/ai/functions/input-hash"
import type { Lead } from "@syntra/db"

let pass = 0
let fail = 0

function assert(cond: unknown, label: string): void {
  if (cond) {
    pass++
    console.log(`  ok   ${label}`)
  } else {
    fail++
    console.log(`  FAIL ${label}`)
  }
}

function expectThrow(fn: () => unknown, label: string): void {
  try {
    fn()
    fail++
    console.log(`  FAIL ${label} — expected throw, got no throw`)
  } catch (err) {
    if (err instanceof MalformedResponseError) {
      pass++
      console.log(`  ok   ${label}`)
    } else {
      fail++
      console.log(`  FAIL ${label} — threw ${err}`)
    }
  }
}

// ── parser: happy path ──────────────────────────────────────────────────
const VALID = `SUMMARY: A multi-line summary describing the lead's context.

OBSERVED:
- Interested in Syntra OS.
- Audit submission with a stated challenge.

INFERRED:
- The combination of OS interest and an articulated challenge may suggest a
  broad operations problem rather than a point-tool evaluation.

UNKNOWN:
- Current operational tooling.
- Headcount or team size.

CONFIDENCE: medium

SCORE: 62`

const p = parseReasoning(VALID)
assert(p.summary.startsWith("A multi-line summary"), "parser: summary extracted")
assert(p.observed.length === 2, "parser: observed items count")
assert(p.inferred.length === 1, "parser: inferred items count (multiline joined)")
assert(p.unknown.length === 2, "parser: unknown items count")
assert(p.confidence === "medium", "parser: confidence")
assert(p.score === 62, "parser: integer score")

// ── parser: NULL score encouraged ──────────────────────────────────────
const NULL_SCORE = VALID.replace("SCORE: 62", "SCORE: NULL")
assert(parseReasoning(NULL_SCORE).score === null, "parser: NULL score accepted")
assert(parseReasoning(NULL_SCORE.replace("SCORE: NULL", "SCORE: null")).score === null, "parser: lowercase null accepted")

// ── parser: fenced ```-wrapped response accepted ───────────────────────
const FENCED = "```\n" + VALID + "\n```"
assert(parseReasoning(FENCED).confidence === "medium", "parser: single code fence stripped")

// ── parser: "(none)" collapses to empty list ───────────────────────────
const NONE = VALID.replace("INFERRED:\n- The combination of OS interest and an articulated challenge may suggest a\n  broad operations problem rather than a point-tool evaluation.", "INFERRED:\n- (none)")
assert(parseReasoning(NONE).inferred.length === 0, "parser: (none) → empty list")

// ── parser: malformations ──────────────────────────────────────────────
expectThrow(() => parseReasoning(""), "parser: empty throws")
expectThrow(() => parseReasoning("here is my analysis\n" + VALID), "parser: preamble throws")
expectThrow(() => parseReasoning(VALID.replace("CONFIDENCE: medium", "CONFIDENCE: certain")), "parser: invalid confidence throws")
expectThrow(() => parseReasoning(VALID.replace("SCORE: 62", "SCORE: high")), "parser: non-integer score throws")
expectThrow(() => parseReasoning(VALID.replace("SCORE: 62", "SCORE: 150")), "parser: out-of-range score throws")
expectThrow(() => parseReasoning(VALID.replace("SCORE: 62", "SCORE: -5")), "parser: negative score throws")
expectThrow(
  () => parseReasoning(VALID.replace("UNKNOWN:\n- Current operational tooling.\n- Headcount or team size.", "UNKNOWN:")),
  "parser: empty UNKNOWN block throws"
)
expectThrow(
  () => parseReasoning(VALID.replace("SCORE: 62", "")),
  "parser: missing SCORE throws"
)
expectThrow(
  () =>
    parseReasoning(
      VALID.replace("OBSERVED:\n- Interested in Syntra OS.\n- Audit submission with a stated challenge.", "OBSERVED:\nnot a dash line")
    ),
  "parser: non-dash list line throws"
)

// ── redactor ────────────────────────────────────────────────────────────
const sampleLead: Lead = {
  id: "lead-1",
  org_id: "org-1",
  email: "Vincent.Collins@acme-co.com",
  name: "Vincent Collins",
  company: "Acme Co",
  source: "audit",
  score: 42,
  tier: "C",
  ai_score: null,
  ai_reasoning: null,
  ai_analyzed_at: null,
  ai_model: null,
  ai_analysis_version: null,
  ai_analysis_input_hash: null,
  ai_confidence: null,
  audit_answers: { industry: "saas", revenue: "50k-250k", challenge: "manual lead handoff" },
  audit_report: {},
  crm_id: null,
  status: "new",
  metadata: { utm_source: "google", internal_note: "do not share" },
  assigned_to: "user-xyz",
  assignment_status: "assigned",
  campaign_id: "campaign-1",
  interested_service: "os",
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-01T00:00:00Z",
}

const r = redactLeadForPrompt(sampleLead)
assert(r.email_domain === "acme-co.com", "redactor: email domain lowercased")
assert(r.first_name === "Vincent", "redactor: first name only")
assert(r.company === "Acme Co", "redactor: company")
assert(r.industry === "saas", "redactor: industry from audit_answers")
assert(r.revenue === "50k-250k", "redactor: revenue from audit_answers")
assert(r.interested_service === "os", "redactor: interested_service")
assert(r.audit_challenge === "manual lead handoff", "redactor: audit_challenge")
// Blocked fields must not appear in the type at all — grep the formatted
// prompt string to be sure no PII leaked into what we'd actually send.
const formatted = formatRedactedLead(r)
assert(!formatted.includes("vincent.collins"), "redactor: full email never serialized")
assert(!formatted.includes("Collins"), "redactor: last name never serialized")
assert(!formatted.includes("do not share"), "redactor: internal metadata never serialized")
assert(!formatted.includes("user-xyz"), "redactor: assignee never serialized")
assert(!formatted.includes("campaign-1"), "redactor: campaign_id never serialized")
assert(!/score|tier/i.test(formatted), "redactor: deterministic score/tier never serialized")

// ── hashing ─────────────────────────────────────────────────────────────
const h1 = hashAnalysisInput(r)
const h2 = hashAnalysisInput(r)
assert(h1 === h2, "hash: stable for identical input")
assert(/^[0-9a-f]{64}$/.test(h1), "hash: shape is 64 hex chars")

const changed: RedactedLead = { ...r, company: "Different Co" }
assert(hashAnalysisInput(changed) !== h1, "hash: sensitive to company change")

assert(
  hashAnalysisInput(r, "prompt-v2+schema-v1") !== h1,
  "hash: sensitive to analysis-version bump"
)

assert(ANALYSIS_VERSION === "prompt-v1+schema-v1", "hash: ANALYSIS_VERSION matches committed value")

// ── pin snapshot: AI_PIN_SOURCES mirrors what redactLeadForPrompt reads ─
const expectedPinSources = [
  "email", "name", "company", "source", "interested_service", "created_at",
  "audit_answers->>industry", "audit_answers->>revenue", "audit_answers->>challenge",
]
assert(
  AI_PIN_SOURCES.length === expectedPinSources.length &&
    expectedPinSources.every((v, i) => AI_PIN_SOURCES[i] === v),
  "pin: AI_PIN_SOURCES contains exactly the 9 attributes the redactor reads",
)

const snap = snapshotPinFields(sampleLead)
assert(snap.email === sampleLead.email, "pin: snapshots email verbatim")
assert(snap.name === sampleLead.name, "pin: snapshots name verbatim")
assert(snap.company === sampleLead.company, "pin: snapshots company verbatim")
assert(snap.source === sampleLead.source, "pin: snapshots source verbatim")
assert(snap.interested_service === sampleLead.interested_service, "pin: snapshots interested_service verbatim")
assert(snap.created_at === sampleLead.created_at, "pin: snapshots created_at verbatim")
assert(snap["audit_answers->>industry"] === "saas", "pin: snapshots audit_answers.industry")
assert(snap["audit_answers->>revenue"] === "50k-250k", "pin: snapshots audit_answers.revenue")
assert(snap["audit_answers->>challenge"] === "manual lead handoff", "pin: snapshots audit_answers.challenge")

const leadWithNulls = {
  ...sampleLead,
  name: null,
  company: null,
  source: null,
  interested_service: null,
  audit_answers: {},
}
const nullSnap = snapshotPinFields(leadWithNulls)
assert(nullSnap.name === null, "pin: name snapshot preserves null")
assert(nullSnap.company === null, "pin: company snapshot preserves null")
assert(nullSnap.source === null, "pin: source snapshot preserves null")
assert(nullSnap.interested_service === null, "pin: interested_service snapshot preserves null")
assert(nullSnap["audit_answers->>industry"] === null, "pin: audit_answers.industry snapshot preserves null when key absent")

// Divergence guard: analyze-lead.ts must reference AI_PIN_SOURCES (not a
// local copy of the field list). This catches a drift where a reviewer
// extends redact.ts's reads without updating the pin.
const analyzeSrcForPin = readFileSync(
  resolve(__dirname, "../../src/lib/ai/functions/analyze-lead.ts"),
  "utf8"
)
assert(
  /\bAI_PIN_SOURCES\b/.test(analyzeSrcForPin),
  "pin divergence: analyze-lead.ts imports AI_PIN_SOURCES as single source of truth",
)
// Also, the WHERE-clause builder must never pin fields outside the
// AI_PIN_SOURCES list. Loose assertion: no .eq("audit_answers->>other_key"
// forms appear in analyze-lead.ts beyond the three allowed sub-paths.
const auditJsonbRefs = analyzeSrcForPin.match(/audit_answers->>\w+/g) ?? []
const allowedJsonb = new Set(["audit_answers->>industry", "audit_answers->>revenue", "audit_answers->>challenge"])
assert(
  auditJsonbRefs.every((ref) => allowedJsonb.has(ref)),
  "pin divergence: analyze-lead.ts touches no audit_answers sub-key outside the three allowed paths",
)

// ── deterministic-boundary invariant (grep assertion) ──────────────────
// This is non-negotiable per architecture §29 criterion 3: analyze-lead.ts
// must contain zero writes to leads.score or leads.tier. Expressed as a
// source-level test so a future edit that adds one fails loudly instead
// of silently crossing the deterministic/AI boundary.
const analyzeSrc = readFileSync(
  resolve(__dirname, "../../src/lib/ai/functions/analyze-lead.ts"),
  "utf8"
)
assert(
  !/\bscore\s*:/.test(stripComments(analyzeSrc)),
  "boundary: analyze-lead.ts does not write a `score:` field anywhere"
)
assert(
  !/\btier\s*:/.test(stripComments(analyzeSrc)),
  "boundary: analyze-lead.ts does not write a `tier:` field anywhere"
)

function stripComments(src: string): string {
  // Remove // line comments and /* */ block comments so the grep above
  // doesn't false-match on explanatory prose that mentions `score:`.
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
