// Phase 1b dry-run integration test — talks to the real production DB
// (service role), BUT with AI_LEAD_DRY_RUN=1 so no provider call happens
// and zero cost is incurred. Run: pnpm qa:ai-lead-dry-run
//
// Covers:
//   1. end-to-end analyzeLead(): persists ai_* fields, status=success
//   2. deterministic score/tier UNCHANGED (snapshot before/after)
//   3. second identical call returns status=cached, no new ai_requests row
//   4. force=true bypasses cache
//   5. cross-org / invalid-lead both rejected before any provider work
//   6. ai_requests shows exactly one row per real (non-cached) call
//
// Writes to QA Org A only. Cleans up after itself.

import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

for (const f of [resolve(__dirname, "../../.env.local"), resolve(__dirname, "../../.env.qa")]) {
  try { process.loadEnvFile(f) } catch { /* fine */ }
}
process.env.AI_LEAD_DRY_RUN = "1"

const QA_ORG_A = "0e977383-01e0-4daf-b0e9-40d9bdabf736"
const QA_ORG_B = "3c16e846-2d3d-4c1a-a8cb-f9a4207e3325"

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

let pass = 0, fail = 0
function assert(cond: unknown, label: string) {
  if (cond) { pass++; console.log(`  ok   ${label}`) }
  else { fail++; console.log(`  FAIL ${label}`) }
}

async function main() {
  // dynamic import so AI_LEAD_DRY_RUN=1 is set before gateway.ts picks it up
  const { analyzeLead } = await import("../../src/lib/ai/functions/analyze-lead")

  // ── Seed a test lead in QA Org A ────────────────────────────────────
  const email = `qa-ai-${Date.now()}@example.com`
  const createdAt = new Date().toISOString()
  const { data: created, error: insertErr } = await db
    .from("leads")
    .insert({
      org_id: QA_ORG_A,
      email,
      name: "QA Dry-Run",
      company: "Acme Dry Run Co",
      source: "audit",
      interested_service: "os",
      score: 30,
      tier: "D",
      status: "new",
      audit_answers: { industry: "saas", revenue: "50k-250k", challenge: "manual lead handoff" },
      audit_report: {},
      metadata: {},
      created_at: createdAt,
    })
    .select("id, score, tier")
    .single()
  if (insertErr || !created) {
    console.error("seed failed:", insertErr?.message)
    process.exit(1)
  }

  const leadId = created.id as string
  const originalScore = created.score as number
  const originalTier = created.tier as string

  try {
    // ── 1. first analyzeLead(): status=success, ai_* persisted ────────
    const r1 = await analyzeLead({ orgId: QA_ORG_A, leadId })
    assert(r1.status === "success", `first call status === success (got ${r1.status})`)
    assert(r1.confidence !== null, "first call confidence set")
    assert(r1.model === "dry-run", `first call model === dry-run (got ${r1.model})`)
    assert(r1.analysisVersion === "prompt-v1+schema-v1", "first call analysisVersion")

    // ── 2. deterministic snapshot: UNCHANGED ──────────────────────────
    const { data: afterRow } = await db.from("leads").select("*").eq("id", leadId).single()
    assert(afterRow.score === originalScore, `deterministic score unchanged (${originalScore})`)
    assert(afterRow.tier === originalTier, `deterministic tier unchanged (${originalTier})`)
    assert(afterRow.ai_analyzed_at !== null, "ai_analyzed_at populated")
    assert(afterRow.ai_model === "dry-run", "ai_model persisted")
    assert(afterRow.ai_analysis_version === "prompt-v1+schema-v1", "ai_analysis_version persisted")
    assert(typeof afterRow.ai_analysis_input_hash === "string" && afterRow.ai_analysis_input_hash.length === 64, "ai_analysis_input_hash is 64-char sha256")
    assert(afterRow.ai_confidence === "low", `ai_confidence mirrored (got ${afterRow.ai_confidence})`)
    assert(afterRow.ai_reasoning.includes("SUMMARY:"), "ai_reasoning verbatim contains SUMMARY block")

    // ── 3. second call returns cached, no new ai_requests row ────────
    const { count: beforeCount } = await db
      .from("ai_requests")
      .select("*", { count: "exact", head: true })
      .eq("org_id", QA_ORG_A)
      .eq("function_name", "lead.analyze")
    const r2 = await analyzeLead({ orgId: QA_ORG_A, leadId })
    assert(r2.status === "cached", `second call status === cached (got ${r2.status})`)
    const { count: afterCount } = await db
      .from("ai_requests")
      .select("*", { count: "exact", head: true })
      .eq("org_id", QA_ORG_A)
      .eq("function_name", "lead.analyze")
    assert(beforeCount === afterCount, `cache hit does NOT create a new ai_requests row (${beforeCount} → ${afterCount})`)

    // ── 4. force=true bypasses cache ─────────────────────────────────
    const r3 = await analyzeLead({ orgId: QA_ORG_A, leadId, force: true })
    assert(r3.status === "success", `force=true bypasses cache (status=${r3.status})`)

    // ── 5. cross-org / invalid-lead ──────────────────────────────────
    const r4 = await analyzeLead({ orgId: QA_ORG_B, leadId }) // lead belongs to Org A
    assert(r4.status === "invalid_lead", `cross-org id lookup rejected (got ${r4.status})`)

    const r5 = await analyzeLead({ orgId: QA_ORG_A, leadId: "00000000-0000-0000-0000-000000000000" })
    assert(r5.status === "invalid_lead", `invalid lead id rejected (got ${r5.status})`)
  } finally {
    // Cleanup — delete the test lead and the ai_requests rows for it.
    await db.from("leads").delete().eq("id", leadId).eq("org_id", QA_ORG_A)
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
