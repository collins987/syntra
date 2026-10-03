// Phase 1f-γ2 — audit challenge cap integration test.
//
// Runs against the LOCAL dev server (QA_BASE_URL=http://localhost:3000 by
// default) so the local code's cap enforcement is exercised. Writes land in
// SYNTRA_INTAKE_ORG_ID on the production DB (service role) only when the
// request is accepted — so over-limit rejections create NOTHING in the DB.
// Each accepted test lead is deleted on cleanup.
//
// Run: pnpm qa:audit-cap

import { createClient } from "@supabase/supabase-js"
import { resolve } from "path"

for (const f of [
  resolve(__dirname, "../../.env.local"),
  resolve(__dirname, "../../.env.qa"),
]) {
  try { process.loadEnvFile(f) } catch { /* fine */ }
}

const baseUrl = process.env.QA_BASE_URL ?? "http://localhost:3000"
const INTAKE_ORG_ID = process.env.SYNTRA_INTAKE_ORG_ID ?? ""

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

async function submit(challenge: string | null): Promise<{ status: number; email: string }> {
  const email = `qa-cap-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
  const body: Record<string, unknown> = {
    name: "QA Cap",
    email,
    company: "Cap Co",
    industry: "saas",
    revenue: "50k-250k",
    interested_service: "os",
  }
  if (challenge !== null) body.challenge = challenge
  const res = await fetch(`${baseUrl}/api/audit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return { status: res.status, email }
}

async function readLead(email: string) {
  if (!INTAKE_ORG_ID) return null
  const { data } = await db
    .from("leads")
    .select("id, audit_answers")
    .eq("org_id", INTAKE_ORG_ID)
    .eq("email", email)
    .maybeSingle()
  return data as { id: string; audit_answers: Record<string, unknown> } | null
}

async function cleanup(email: string) {
  if (!INTAKE_ORG_ID) return
  await db.from("leads").delete().eq("org_id", INTAKE_ORG_ID).eq("email", email)
}

async function main() {
  // 1. missing challenge → existing behavior preserved (accepted)
  {
    const r = await submit(null)
    assert(r.status === 200, `1. missing challenge → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === undefined || lead?.audit_answers.challenge === null,
      "1. missing challenge → audit_answers.challenge absent/null")
    await cleanup(r.email)
  }

  // 2. empty string → treated as absent
  {
    const r = await submit("")
    assert(r.status === 200, `2. empty-string challenge → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === null, "2. empty-string → stored as null")
    await cleanup(r.email)
  }

  // 3. whitespace-only → treated as absent
  {
    const r = await submit("   \n  \t  ")
    assert(r.status === 200, `3. whitespace-only → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === null, "3. whitespace-only → stored as null")
    await cleanup(r.email)
  }

  // 4. 1999 ASCII → accepted, stored verbatim
  {
    const content = "a".repeat(1999)
    const r = await submit(content)
    assert(r.status === 200, `4. 1999 chars → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === content, "4. 1999 chars → stored byte-identical")
    await cleanup(r.email)
  }

  // 5. exactly 2000 ASCII → accepted
  {
    const content = "a".repeat(2000)
    const r = await submit(content)
    assert(r.status === 200, `5. exactly 2000 → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === content, "5. 2000 → stored byte-identical")
    await cleanup(r.email)
  }

  // 6. 2001 ASCII → 400, no lead created
  {
    const content = "a".repeat(2001)
    const r = await submit(content)
    assert(r.status === 400, `6. 2001 chars → 400 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead === null, "6. 2001 → no lead row created")
  }

  // 7. exactly 2000 emoji code points → accepted
  // "🙂" is one code point but 2 UTF-16 code units. 2000 of them = 2000 code
  // points but 4000 .length. The cap counts code points.
  {
    const emoji = "🙂"
    const content = emoji.repeat(2000)
    assert(content.length === 4000, "7. precondition: 2000 emoji = 4000 UTF-16 units")
    assert([...content].length === 2000, "7. precondition: 2000 emoji = 2000 code points")
    const r = await submit(content)
    assert(r.status === 200, `7. 2000 emoji code points → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead !== null, "7. 2000 emoji → lead created")
    await cleanup(r.email)
  }

  // 8. 2001 emoji code points → 400
  {
    const content = "🙂".repeat(2001)
    const r = await submit(content)
    assert(r.status === 400, `8. 2001 emoji code points → 400 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead === null, "8. 2001 emoji → no lead row created")
  }

  // 9. multiline challenge within limit → accepted
  {
    const content = "line one\nline two\nline three"
    const r = await submit(content)
    assert(r.status === 200, `9. multiline → 200 (got ${r.status})`)
    const lead = await readLead(r.email)
    assert(lead?.audit_answers.challenge === content, "9. multiline stored byte-identical (newlines preserved)")
    await cleanup(r.email)
  }

  // 10. Direct API POST bypassing UI — this harness IS a direct API POST; the
  //     earlier assertions already prove rejection isn't UI-dependent. Here
  //     we re-assert for clarity: submitting via plain fetch to /api/audit
  //     with 2001 chars still returns 400.
  {
    const r = await submit("x".repeat(2001))
    assert(r.status === 400, "10. direct API POST with 2001 chars → 400 (UI not consulted)")
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((e) => { console.error(e); process.exit(1) })
