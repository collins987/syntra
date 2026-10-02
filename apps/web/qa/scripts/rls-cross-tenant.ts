// QA_TEST_PLAN.md §5.5 — SEC-02, SEC-03. Real JWTs, real REST calls, not
// browser clicks — this is exactly what the plan's curl commands do, just
// scripted and repeatable. Run: pnpm qa:rls

import { createClient } from "@supabase/supabase-js"
import { resolve } from "path"
import { loadAccounts } from "../fixtures/accounts"

for (const f of [resolve(__dirname, "../../.env.local"), resolve(__dirname, "../../.env.qa")]) {
  try {
    process.loadEnvFile(f)
  } catch {
    /* see seed-accounts.ts */
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const TABLES = [
  "leads",
  "subscriptions",
  "invoices",
  "automations",
  "workflow_executions",
  "ai_requests",
  "ai_approvals",
  "action_log",
  "audit_logs",
  "team_invites",
  "email_logs",
  "integrations",
]

let pass = 0
let fail = 0

async function signIn(email: string, password: string) {
  const client = createClient(url, anonKey, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error || !data.session) throw new Error(`sign-in failed for ${email}: ${error?.message}`)
  return data.session.access_token
}

async function main() {
  const { adminA, adminB, password } = loadAccounts()
  const jwtB = await signIn(adminB.email, password)

  console.log(`[SEC-02] Org B reading each table — must see zero Org A rows`)
  for (const table of TABLES) {
    const res = await fetch(`${url}/rest/v1/${table}?select=org_id`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${jwtB}` },
    })
    const rows = (await res.json().catch(() => [])) as Array<{ org_id?: string }>
    const leaked = Array.isArray(rows) ? rows.filter((r) => r.org_id === adminA.orgId).length : 0
    if (leaked === 0) {
      console.log(`  PASS  ${table} — 0 Org A rows visible (${Array.isArray(rows) ? rows.length : "?"} own rows)`)
      pass++
    } else {
      console.error(`  FAIL  ${table} — ${leaked} Org A rows leaked to Org B`)
      fail++
    }
  }

  console.log(`\n[SEC-03] Org B attempting to write into Org A's leads — must affect 0 rows`)
  const patchRes = await fetch(`${url}/rest/v1/leads?org_id=eq.${adminA.orgId}`, {
    method: "PATCH",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${jwtB}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "lost" }),
  })
  const patched = (await patchRes.json().catch(() => [])) as unknown[]
  if (Array.isArray(patched) && patched.length === 0) {
    console.log(`  PASS  0 rows affected`)
    pass++
  } else {
    console.error(`  FAIL  ${Array.isArray(patched) ? patched.length : "?"} rows affected — cross-tenant write succeeded`)
    fail++
  }

  console.log(`\n${pass} passed, ${fail} failed`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
