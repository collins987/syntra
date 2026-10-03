import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"
import { loginAs } from "../fixtures/login"
import { createClient } from "@supabase/supabase-js"
import { resolve } from "path"

// Phase 1c — the Action Gateway capability `ai.analyze_lead`, exposed to
// admins through POST /api/leads/[id]/analyze (cookie session, admin-only).
// Runs under AI_LEAD_DRY_RUN=1 so no provider call occurs; the capability's
// own cache + the gateway's idempotency are both exercised. Every path
// through this spec writes to the real production DB (QA Org A/B), so
// each test cleans up the test lead it created.

const QA_ORG_A = "0e977383-01e0-4daf-b0e9-40d9bdabf736"

function serviceClient() {
  for (const f of [resolve(__dirname, "../../.env.local"), resolve(__dirname, "../../.env.qa")]) {
    try { process.loadEnvFile(f) } catch { /* fine */ }
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function seedTestLead(email: string) {
  const db = serviceClient()
  const { data, error } = await db
    .from("leads")
    .insert({
      org_id: QA_ORG_A,
      email,
      name: "QA AI Analyze Test",
      company: "Acme AI Test Co",
      source: "audit",
      interested_service: "os",
      score: 30,
      tier: "D",
      status: "new",
      audit_answers: { industry: "saas", revenue: "50k-250k", challenge: "manual lead handoff" },
      audit_report: {},
      metadata: {},
    })
    .select("id, score, tier")
    .single()
  if (error || !data) throw new Error(`seed failed: ${error?.message ?? "no data"}`)
  return data as { id: string; score: number; tier: string }
}

async function deleteTestLead(id: string) {
  const db = serviceClient()
  await db.from("leads").delete().eq("id", id).eq("org_id", QA_ORG_A)
}

async function readLead(id: string) {
  const db = serviceClient()
  const { data } = await db.from("leads").select("*").eq("id", id).single()
  return data
}

test.describe("as adminA (ai.analyze_lead gateway capability)", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("LI-AI-01 — admin can invoke; result persists; deterministic unchanged", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-ok-${Date.now()}@example.com`)
    try {
      const res = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(res.status()).toBe(200)
      const body = await res.json()
      expect(body.status).toBe("success")
      expect(body.result.status).toBe("success")
      expect(body.result.model).toBe("dry-run")
      expect(body.result.analysisVersion).toBe("prompt-v1+schema-v1")

      const after = await readLead(seeded.id)
      expect(after.score).toBe(seeded.score)
      expect(after.tier).toBe(seeded.tier)
      expect(after.ai_analyzed_at).not.toBeNull()
      expect(after.ai_model).toBe("dry-run")
      expect(after.ai_analysis_version).toBe("prompt-v1+schema-v1")
      expect(after.ai_confidence).toBe("low")
      expect(typeof after.ai_analysis_input_hash).toBe("string")
      expect(after.ai_analysis_input_hash).toHaveLength(64)
      expect(after.ai_reasoning).toContain("SUMMARY:")
    } finally {
      await deleteTestLead(seeded.id)
    }
  })

  test("LI-AI-02 — second call returns cached (via analyzeLead's own cache)", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-cache-${Date.now()}@example.com`)
    try {
      const first = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(first.status()).toBe(200)
      const second = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(second.status()).toBe(200)
      const body = await second.json()
      // The gateway idempotency key is uuid-fresh per request, so this is
      // never a gateway `duplicate` — the `cached` comes from analyzeLead's
      // own ai_analysis_input_hash check, which is exactly what we want to
      // prove works end-to-end.
      expect(body.result.status).toBe("cached")
    } finally {
      await deleteTestLead(seeded.id)
    }
  })

  test("LI-AI-03 — invalid leadId (unknown uuid) is rejected without touching AI", async ({ page }) => {
    const res = await page.request.post(
      `/api/leads/00000000-0000-0000-0000-000000000000/analyze`,
      { data: {} }
    )
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.result.status).toBe("invalid_lead")
    expect(body.result.aiScore).toBeNull()
    expect(body.result.model).toBeNull()
  })

  test("LI-AI-04 — non-uuid leadId is rejected at capability validate (blocked)", async ({ page }) => {
    const res = await page.request.post(`/api/leads/not-a-uuid/analyze`, { data: {} })
    // Gateway surfaces capability validate() failures as HTTP 403 blocked.
    expect(res.status()).toBe(403)
    const body = await res.json()
    expect(body.status).toBe("blocked")
  })
})

test.describe("as adminB (cross-org isolation)", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminB.json"
  test.beforeAll(async () => {
    const { adminB, password } = loadAccounts()
    await ensureFreshAuthState(adminB.email, password, AUTH_PATH)
  })

  test("LI-AI-05 — adminB cannot analyze an Org A lead", async ({ page }) => {
    // Fresh in-test password login (same pattern as 14-lead-intelligence-v2
    // LI-V2-H): avoids the storage-state race on an org whose session
    // hasn't been warmed by an earlier spec.
    const { adminB, password } = loadAccounts()
    await loginAs(page, adminB.email, password)

    const seeded = await seedTestLead(`qa-ai-xorg-${Date.now()}@example.com`)
    try {
      const res = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(res.status()).toBe(200) // invalid_lead is a result-level status, not an HTTP code
      const body = await res.json()
      // The capability resolves `orgId` from adminB's session, SELECTs the
      // lead eq("org_id", adminB_org_id) — zero rows → invalid_lead.
      // Importantly: this is the SAME shape as a truly unknown leadId, so
      // adminB cannot tell whether the lead exists elsewhere.
      expect(body.result.status).toBe("invalid_lead")

      // Lead's ai_* fields must still be null — adminB's request never
      // reached the AI layer at all.
      const after = await readLead(seeded.id)
      expect(after.ai_analyzed_at).toBeNull()
      expect(after.ai_model).toBeNull()
    } finally {
      await deleteTestLead(seeded.id)
    }
  })
})

test.describe("as userA (non-admin)", () => {
  const AUTH_PATH = "qa/fixtures/.auth/userA.json"
  test.beforeAll(async () => {
    const { userA, password } = loadAccounts()
    await ensureFreshAuthState(userA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("LI-AI-06 — non-admin is 403 before any AI work happens", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-nonadmin-${Date.now()}@example.com`)
    try {
      const res = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(res.status()).toBe(403)
      // Must be stopped at the HTTP layer — ai_* fields unchanged.
      const after = await readLead(seeded.id)
      expect(after.ai_analyzed_at).toBeNull()
    } finally {
      await deleteTestLead(seeded.id)
    }
  })
})

test("LI-AI-07 — unauthenticated request is 401", async ({ request }) => {
  // request fixture has no cookies — fresh context, no session.
  const res = await request.post(
    "/api/leads/00000000-0000-0000-0000-000000000000/analyze",
    { data: {} }
  )
  expect(res.status()).toBe(401)
})

// ── Phase 1d — Lead detail UI ─────────────────────────────────────────────

test.describe("Lead detail UI — as adminA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("LI-D-01 — admin can open /portal/leads/[id] and see both panels", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-ui-${Date.now()}@example.com`)
    try {
      await page.goto(`/portal/leads/${seeded.id}`)
      await expect(page.getByText("Deterministic Qualification")).toBeVisible()
      await expect(page.getByText("AI Intelligence", { exact: true })).toBeVisible()
      // Both panels render even before AI has run.
      await expect(page.getByText("No AI analysis yet.")).toBeVisible()
      // Deterministic score+tier badge visible with seeded values 30/D.
      await expect(page.getByText("30D", { exact: true })).toBeVisible()
    } finally {
      await deleteTestLead(seeded.id)
    }
  })

  test("LI-D-02 — Analyze with AI invokes ai.analyze_lead and renders result; deterministic unchanged", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-ui-run-${Date.now()}@example.com`)
    try {
      await page.goto(`/portal/leads/${seeded.id}`)
      const btn = page.getByRole("button", { name: "Analyze with AI" })
      await expect(btn).toBeVisible()
      await btn.click()
      // Dry-run fixture carries confidence "low" and summary line.
      await expect(page.getByText("Analysis complete")).toBeVisible({ timeout: 15_000 })
      // Confidence is rendered as lowercase text with a CSS capitalize
      // transform — assert the DOM text (lowercase).
      await expect(page.getByText("low", { exact: true })).toBeVisible()
      // Model + analyzed-timestamp line is rendered uniquely; strict-mode
      // requires scoping — pick the trailing metadata line.
      await expect(page.getByText(/dry-run · analyzed/i)).toBeVisible()

      // Deterministic badge still 30D — the AI write never touched score/tier.
      await expect(page.getByText("30D", { exact: true })).toBeVisible()

      const after = await readLead(seeded.id)
      expect(after.score).toBe(seeded.score)
      expect(after.tier).toBe(seeded.tier)
      expect(after.ai_model).toBe("dry-run")
    } finally {
      await deleteTestLead(seeded.id)
    }
  })

  test("LI-D-03 — second analyze shows cached state", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-ui-cache-${Date.now()}@example.com`)
    try {
      await page.goto(`/portal/leads/${seeded.id}`)
      await page.getByRole("button", { name: "Analyze with AI" }).click()
      await expect(page.getByText("Analysis complete")).toBeVisible({ timeout: 15_000 })

      // After a successful run the button becomes Re-analyze with AI.
      await page.getByRole("button", { name: "Re-analyze with AI" }).click()
      await expect(page.getByText("Reused last analysis (inputs unchanged)")).toBeVisible({
        timeout: 15_000,
      })
    } finally {
      await deleteTestLead(seeded.id)
    }
  })

  test("LI-D-04 — stale banner shown when stored analysis is from an older version", async ({ page }) => {
    // Seed a lead whose ai_* fields are populated with a deliberately
    // outdated analysis_version. The page's staleness check compares
    // stored ai_analysis_version to the app's current ANALYSIS_VERSION,
    // so this flags without any live hash recompute drift.
    const email = `qa-ai-ui-stale-${Date.now()}@example.com`
    const db = serviceClient()
    const { data } = await db
      .from("leads")
      .insert({
        org_id: QA_ORG_A,
        email,
        name: "QA Stale Analysis",
        company: "Stale Co",
        source: "audit",
        interested_service: "os",
        score: 30,
        tier: "D",
        status: "new",
        audit_answers: {},
        audit_report: {},
        metadata: {},
        ai_score: 42,
        ai_reasoning: "SUMMARY: An older stored analysis.\n\nOBSERVED:\n- Old data.\n\nINFERRED:\n- (none)\n\nUNKNOWN:\n- (none)\n\nCONFIDENCE: low\n\nSCORE: 42",
        ai_confidence: "low",
        ai_analyzed_at: new Date().toISOString(),
        ai_model: "dry-run",
        ai_analysis_version: "prompt-v0+schema-v0", // deliberately old
        ai_analysis_input_hash: "0".repeat(64),
      })
      .select("id")
      .single()
    const leadId = (data as { id: string }).id
    try {
      await page.goto(`/portal/leads/${leadId}`)
      await expect(
        page.getByText(/this analysis is from an earlier version/i)
      ).toBeVisible()
    } finally {
      await deleteTestLead(leadId)
    }
  })

  test("LI-D-05 — unknown lead id → not-found", async ({ page }) => {
    // Next.js app-router notFound() renders a 404 page but the HTTP
    // response is often 200 — assert on the rendered content instead.
    await page.goto("/portal/leads/00000000-0000-0000-0000-000000000000")
    await expect(page.getByRole("heading", { name: /this page could not be found/i })).toBeVisible()
    // The deterministic panel of a real lead must NOT be visible.
    await expect(page.getByText("Deterministic Qualification")).toHaveCount(0)
  })
})

test.describe("Lead detail UI — as adminB (cross-org)", () => {
  test("LI-D-06 — adminB cannot view an Org A lead detail (not-found + no data leak)", async ({ page }) => {
    const { adminB, password } = loadAccounts()
    await loginAs(page, adminB.email, password)
    const seeded = await seedTestLead(`qa-ai-ui-xorg-${Date.now()}@example.com`)
    try {
      // RLS SELECT returns 0 rows for adminB → notFound() → not-found UI.
      await page.goto(`/portal/leads/${seeded.id}`)
      await expect(
        page.getByRole("heading", { name: /this page could not be found/i })
      ).toBeVisible()
      // Must not render Org A's lead data under any circumstance.
      await expect(page.getByText("Deterministic Qualification")).toHaveCount(0)
    } finally {
      await deleteTestLead(seeded.id)
    }
  })
})

test.describe("Lead detail UI — as userA (non-admin)", () => {
  const AUTH_PATH = "qa/fixtures/.auth/userA.json"
  test.beforeAll(async () => {
    const { userA, password } = loadAccounts()
    await ensureFreshAuthState(userA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("LI-D-07 — non-admin sees detail but no Analyze button; API still rejects a direct call", async ({ page }) => {
    const seeded = await seedTestLead(`qa-ai-ui-nonadmin-${Date.now()}@example.com`)
    try {
      await page.goto(`/portal/leads/${seeded.id}`)
      // Non-admin can read lead detail (member-level RLS).
      await expect(page.getByText("Deterministic Qualification")).toBeVisible()
      // But the Analyze button is admin-only — must not render.
      await expect(page.getByRole("button", { name: /analyze.*with ai/i })).toHaveCount(0)

      // Server authorization is still the boundary — direct POST is 403.
      const res = await page.request.post(`/api/leads/${seeded.id}/analyze`, { data: {} })
      expect(res.status()).toBe(403)
      const after = await readLead(seeded.id)
      expect(after.ai_analyzed_at).toBeNull()
    } finally {
      await deleteTestLead(seeded.id)
    }
  })
})
