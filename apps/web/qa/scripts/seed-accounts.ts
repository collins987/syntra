// Creates the 5 test accounts QA_TEST_PLAN.md §2.1 calls for (ADMIN-A, USER-A,
// ADMIN-B, PLATFORM, NO-ORG) and writes their credentials + org ids to
// qa/fixtures/accounts.generated.json, which every Playwright spec reads.
//
// Uses supabase.auth.admin.createUser({ email_confirm: true }) rather than the
// public signUp() flow — that's the service-role admin API, not a workaround.
// It sidesteps the "does this suite need real inbox access" question for
// account creation specifically (it still needs it for the specs that test
// invite/reset emails themselves — see PLAYWRIGHT_QA_PLAN.md §5).
//
// Idempotent: re-running skips any account whose org/membership already exists.
//
// Run: pnpm qa:seed   (loads .env.local + .env.qa automatically, see package.json)

import { createClient } from "@supabase/supabase-js"
import { writeFileSync } from "fs"
import { resolve } from "path"

for (const f of [resolve(__dirname, "../../.env.local"), resolve(__dirname, "../../.env.qa")]) {
  try {
    process.loadEnvFile(f)
  } catch {
    // Optional — .env.qa in particular may not exist yet if the user hasn't
    // copied .env.qa.example, which is a clear error a few lines below anyway.
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) {
  console.error("[seed] NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — load .env.local first.")
  process.exit(1)
}

if (!process.env.QA_PASSWORD) {
  console.error("[seed] QA_PASSWORD not set — copy .env.qa.example to .env.qa and fill it in.")
  process.exit(1)
}
// Narrowed via the check above, but that doesn't cross into functions below —
// same reason the app's own code hits this with exactOptionalPropertyTypes.
const password: string = process.env.QA_PASSWORD

const emails = {
  adminA: process.env.QA_EMAIL_ADMIN_A,
  userA: process.env.QA_EMAIL_USER_A,
  adminB: process.env.QA_EMAIL_ADMIN_B,
  platform: process.env.QA_EMAIL_PLATFORM,
  noOrg: process.env.QA_EMAIL_NOORG,
}
for (const [key, value] of Object.entries(emails)) {
  if (!value) {
    console.error(`[seed] QA_EMAIL_${key.replace(/([A-Z])/g, "_$1").toUpperCase()} not set — see .env.qa.example`)
    process.exit(1)
  }
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } })

async function findOrCreateUser(email: string): Promise<string> {
  // No admin.getUserByEmail in supabase-js — list and match, fine at this scale.
  const { data: list } = await db.auth.admin.listUsers({ perPage: 200 })
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase())
  if (existing) {
    console.log(`[seed] user exists: ${email}`)
    return existing.id
  }
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error || !data.user) throw new Error(`[seed] failed to create ${email}: ${error?.message}`)
  console.log(`[seed] created user: ${email}`)
  return data.user.id
}

async function findOrCreateOrg(name: string, slug: string): Promise<string> {
  const { data: existing } = await db.from("organizations").select("id").eq("slug", slug).maybeSingle()
  if (existing) {
    console.log(`[seed] org exists: ${name}`)
    return existing.id as string
  }
  const { data, error } = await db
    .from("organizations")
    .insert({ name, slug, plan: "sites", settings: {} })
    .select("id")
    .single()
  if (error || !data) throw new Error(`[seed] failed to create org ${name}: ${error?.message}`)
  console.log(`[seed] created org: ${name}`)
  return data.id as string
}

async function ensureMember(orgId: string, userId: string, role: "CLIENT_ADMIN" | "CLIENT_USER") {
  const { data: existing } = await db
    .from("organization_members")
    .select("id")
    .eq("org_id", orgId)
    .eq("user_id", userId)
    .maybeSingle()
  if (existing) return
  const { error } = await db.from("organization_members").insert({ org_id: orgId, user_id: userId, role })
  if (error) throw new Error(`[seed] failed to add member: ${error.message}`)
  console.log(`[seed] added membership (${role})`)
}

/**
 * A fresh agent only gets its minimal defaultTools (e.g. Ava: site.read +
 * content.performance, NOT email.send — that's deliberate, grantable-not-default
 * security posture, see lib/ai/agents.ts). AI-07/APR-01 need the irreversible
 * tool actually granted to exercise the approval flow at all — an admin would
 * normally do this once via /portal/ai-agents; this does the same thing via
 * service role so the QA org doesn't need a manual UI step after every reseed.
 */
async function ensureAgentGranted(orgId: string, agentKey: string, displayName: string, tools: string[]) {
  const { data: existing } = await db
    .from("ai_agents")
    .select("id, granted_tools")
    .eq("org_id", orgId)
    .eq("agent_key", agentKey)
    .maybeSingle()

  if (!existing) {
    const { error } = await db.from("ai_agents").insert({
      org_id: orgId,
      agent_key: agentKey,
      display_name: displayName,
      autonomy_level: 1,
      status: "active",
      granted_tools: tools,
      business_context: {},
    })
    if (error) throw new Error(`[seed] failed to create agent ${agentKey}: ${error.message}`)
    console.log(`[seed] created agent ${agentKey} with tools: ${tools.join(", ")}`)
    return
  }

  const missing = tools.filter((t) => !existing.granted_tools?.includes(t))
  if (missing.length === 0) return
  const { error } = await db
    .from("ai_agents")
    .update({ granted_tools: [...(existing.granted_tools ?? []), ...missing] })
    .eq("id", existing.id)
  if (error) throw new Error(`[seed] failed to grant tools to ${agentKey}: ${error.message}`)
  console.log(`[seed] granted ${missing.join(", ")} to agent ${agentKey}`)
}

async function main() {
  const adminAId = await findOrCreateUser(emails.adminA!)
  const userAId = await findOrCreateUser(emails.userA!)
  const adminBId = await findOrCreateUser(emails.adminB!)
  const platformId = await findOrCreateUser(emails.platform!)
  const noOrgId = await findOrCreateUser(emails.noOrg!)

  const orgAId = await findOrCreateOrg("QA Org A", "qa-org-a")
  const orgBId = await findOrCreateOrg("QA Org B", "qa-org-b")

  await ensureMember(orgAId, adminAId, "CLIENT_ADMIN")
  await ensureMember(orgAId, userAId, "CLIENT_USER")
  await ensureMember(orgBId, adminBId, "CLIENT_ADMIN")

  // AI-07/APR-01 need Ava able to actually propose email.send.
  await ensureAgentGranted(orgAId, "ava", "Ava", ["site.read", "content.performance", "email.send"])

  // app_metadata (not user_metadata — that's the whole point of D-009/F-09:
  // user_metadata is self-editable, app_metadata isn't).
  const { error: platformErr } = await db.auth.admin.updateUserById(platformId, {
    app_metadata: { is_admin: true },
  })
  if (platformErr) throw new Error(`[seed] failed to grant platform admin: ${platformErr.message}`)
  console.log("[seed] granted PLATFORM app_metadata.is_admin")

  // NO-ORG deliberately gets no org/membership — that's the whole point of it.

  const out = {
    password,
    adminA: { email: emails.adminA, userId: adminAId, orgId: orgAId, role: "CLIENT_ADMIN" },
    userA: { email: emails.userA, userId: userAId, orgId: orgAId, role: "CLIENT_USER" },
    adminB: { email: emails.adminB, userId: adminBId, orgId: orgBId, role: "CLIENT_ADMIN" },
    platform: { email: emails.platform, userId: platformId },
    noOrg: { email: emails.noOrg, userId: noOrgId },
  }
  const outPath = resolve(__dirname, "../fixtures/accounts.generated.json")
  writeFileSync(outPath, JSON.stringify(out, null, 2))
  console.log(`[seed] wrote ${outPath}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
