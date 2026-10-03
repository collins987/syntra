// Lead Intelligence v2 — the mandatory final sanity check, now codified as a
// repeatable assertion rather than a one-off manual calculation. Scores the
// exact 8 scenarios approved before implementation, against the exact
// approved policy data (duplicated here deliberately, not imported, so a
// future edit to the seed policy in lib/leads/scoring.ts makes this test
// fail loudly instead of silently tracking the change). Run: pnpm qa:scoring
//
// scoreLead() is pure — no DB, no network, no env needed.

import { scoreLead, type LeadSignals } from "../../src/lib/leads/scoring"
import type { LeadScoringPolicy } from "@syntra/db"

const POLICY: Array<Omit<LeadScoringPolicy, "id" | "org_id" | "created_at">> = [
  { field: "interested_service", operator: "equals", value: "os", points: 25, category: "intent", explanation: "Interested in the complete SYNTRA platform (OS).", enabled: true },
  { field: "interested_service", operator: "in", value: ["sites", "flow", "growth"], points: 18, category: "intent", explanation: "Interested in Syntra {service}.", enabled: true },
  { field: "source", operator: "equals", value: "audit", points: 15, category: "intent", explanation: "Came from the audit funnel.", enabled: true },
  { field: "revenue", operator: "equals", value: "under-10k", points: 5, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "10k-50k", points: 10, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "50k-250k", points: 15, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "250k-1m", points: 20, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "revenue", operator: "equals", value: "over-1m", points: 25, category: "qualification", explanation: "Revenue range indicates commercial fit.", enabled: true },
  { field: "industry", operator: "in", value: ["ecommerce", "saas", "agency", "real-estate", "finance"], points: 10, category: "qualification", explanation: "Industry matches SYNTRA's typical best-fit profile.", enabled: true },
  { field: "recency", operator: "range", value: { min: 0, max: 7 }, points: 5, category: "engagement", explanation: "Recently submitted.", enabled: true },
  { field: "recency", operator: "range", value: { min: 8, max: 30 }, points: 2, category: "engagement", explanation: "", enabled: true },
  { field: "company", operator: "not_null", value: true, points: 3, category: "completeness", explanation: "Company information provided.", enabled: true },
]

const policy: LeadScoringPolicy[] = POLICY.map((r, i) => ({
  ...r,
  id: `test-${i}`,
  org_id: "test-org",
  created_at: new Date().toISOString(),
}))

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString()
}

// Stale by default (no recency bonus) so each scenario isolates exactly the
// signals it names — scenarios that specifically test recency override this.
const base: LeadSignals = {
  interested_service: null,
  source: null,
  revenue: null,
  industry: null,
  created_at: daysAgo(45),
  company: null,
}

interface Scenario {
  name: string
  lead: LeadSignals
  expectedScore: number
  expectedTier: "A" | "B" | "C" | "D"
}

const scenarios: Scenario[] = [
  {
    name: "1 — empty lead (no signals at all)",
    lead: { ...base },
    expectedScore: 0,
    expectedTier: "D",
  },
  {
    name: "2 — OS interest only",
    lead: { ...base, interested_service: "os" },
    expectedScore: 25,
    expectedTier: "D",
  },
  {
    name: "3 — OS interest + audit source + recent (0-7d)",
    lead: { ...base, interested_service: "os", source: "audit", created_at: daysAgo(0) },
    expectedScore: 25 + 15 + 5, // 45
    expectedTier: "C",
  },
  {
    name: "4 — full qualification: OS + audit + high revenue + fit industry + recent + company",
    lead: {
      ...base,
      interested_service: "os",
      source: "audit",
      revenue: "over-1m",
      industry: "saas",
      company: "Acme Inc",
      created_at: daysAgo(0),
    },
    expectedScore: 25 + 15 + 25 + 10 + 5 + 3, // 83, clamped n/a
    expectedTier: "A",
  },
  {
    name: "5 — mid revenue + fit industry + company, no explicit intent signal",
    lead: { ...base, revenue: "50k-250k", industry: "agency", company: "Acme Inc" },
    expectedScore: 15 + 10 + 3, // 28
    expectedTier: "D",
  },
  {
    name: "6 — stale lead (31+ days), no recency points, moderate qualification",
    lead: { ...base, created_at: daysAgo(45), revenue: "250k-1m", industry: "ecommerce" },
    expectedScore: 20 + 10, // 30
    expectedTier: "D",
  },
  {
    name: "7 — explicit specific-service interest ONLY (sites/flow/growth)",
    lead: { ...base, interested_service: "growth" },
    expectedScore: 18,
    expectedTier: "D", // APPROVED AS-IS — accumulated evidence, not intent presence. Not a bug.
  },
  {
    name: "8 — everything maxed (would exceed 100 without clamping)",
    lead: {
      ...base,
      interested_service: "os",
      source: "audit",
      revenue: "over-1m",
      industry: "finance",
      company: "Acme Inc",
      created_at: daysAgo(0),
    },
    expectedScore: Math.min(25 + 15 + 25 + 10 + 5 + 3, 100), // 83
    expectedTier: "A",
  },
]

let pass = 0
let fail = 0

for (const s of scenarios) {
  const result = scoreLead(s.lead, policy)
  const scoreOk = result.score === s.expectedScore
  const tierOk = result.tier === s.expectedTier
  if (scoreOk && tierOk) {
    pass++
    console.log(`  ok   ${s.name} → score=${result.score} tier=${result.tier}`)
  } else {
    fail++
    console.log(
      `  FAIL ${s.name} → got score=${result.score} tier=${result.tier}, expected score=${s.expectedScore} tier=${s.expectedTier}`
    )
  }
}

// Scenario 7 is the one genuine design tension surfaced during the sanity
// check — explicitly approved as-is by the user. Assert it directly so a
// future change that "fixes" it by inflating the +18 weight fails loudly.
const scenario7 = scenarios.find((s) => s.name.startsWith("7"))!
const scenario7Result = scoreLead(scenario7.lead, policy)
if (scenario7Result.tier !== "D" || scenario7Result.score !== scenario7.expectedScore) {
  fail++
  console.log(
    "  FAIL Scenario 7 invariant — service-interest-only must remain 18 points / Tier D (approved as-is, not an error)"
  )
} else {
  console.log("  ok   Scenario 7 invariant verified: 18 points / Tier D is correct, not an error")
}

console.log(`\n${pass} passed, ${fail} failed`)
if (fail > 0) process.exit(1)
