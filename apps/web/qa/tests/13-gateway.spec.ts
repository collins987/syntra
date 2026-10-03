import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §7.6 — GW-02..09, 11. Written as API calls via `page.request`
// (which shares the logged-in session's cookies) rather than raw curl, since
// the token-mint route is cookie-authenticated, not Bearer-token — a plain
// Node script would have to reimplement Next.js's cookie auth to call it.
//
// Reuses a bootstrapped, warm-refreshed session shared across spec files
// (ensureFreshAuthState) — avoids repeated real password logins, which hit

test.describe("as userA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/userA.json"
  test.beforeAll(async () => {
    const { userA, password } = loadAccounts()
    await ensureFreshAuthState(userA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("GW-02 — non-admin cannot mint a workflow token", async ({ page }) => {
    const res = await page.request.post("/api/integrations/token", {
      data: { label: "qa-test", capabilities: ["crm.upsert"] },
    })
    expect(res.status()).toBe(403)
  })
})

test.describe("as adminA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("GW-03/06/07/08/09/11 — mint, idempotency, duplicate, revoke", async ({ page }) => {
    // GW-03: mint
    const mint = await page.request.post("/api/integrations/token", {
      data: { label: "qa-gateway-test", capabilities: ["crm.upsert"] },
    })
    expect(mint.status()).toBe(200)
    const { token, tokenRecord } = await mint.json()
    expect(token).toBeTruthy()

    // GW-06: idempotency key required
    const noKey = await page.request.post("/api/actions/crm.upsert", {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: "qa-gw@example.com", name: "QA Gateway Test" },
    })
    expect(noKey.status()).toBe(400)

    // GW-07: a valid call succeeds
    const idempotencyKey = `qa-${Date.now()}`
    const first = await page.request.post("/api/actions/crm.upsert", {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
      data: { email: "qa-gw@example.com", name: "QA Gateway Test" },
    })
    expect(first.status()).toBe(200)
    const firstBody = await first.json()
    expect(firstBody.status).toBe("success")

    // GW-08: repeating the same key must not re-run the adapter
    const second = await page.request.post("/api/actions/crm.upsert", {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": idempotencyKey },
      data: { email: "qa-gw@example.com", name: "QA Gateway Test — changed" },
    })
    expect(second.status()).toBe(200)
    const secondBody = await second.json()
    expect(secondBody.status).toBe("duplicate")

    // GW-11: revoke, then the same call must fail
    const revoke = await page.request.delete(`/api/integrations/token?id=${tokenRecord.id}`)
    expect(revoke.status()).toBe(200)

    const afterRevoke = await page.request.post("/api/actions/crm.upsert", {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `qa-${Date.now()}` },
      data: { email: "qa-gw@example.com", name: "QA Gateway Test" },
    })
    expect(afterRevoke.status()).toBe(401)
  })

  test("LI-01 — a lead captured via crm.upsert (the real Flow/Growth path) is visible on /portal/leads", async ({ page }) => {
    // There is exactly one leads table, not one per service — confirmed by
    // reading every write path in the codebase (api/audit/route.ts and this
    // crm.upsert capability are the only two). This proves that in practice,
    // not just by schema inspection: a lead created the way an n8n workflow
    // or AI agent actually would (via the Action Gateway, not a direct
    // insert) shows up on the shared Lead Intelligence page immediately.
    const mint = await page.request.post("/api/integrations/token", {
      data: { label: "qa-li-test", capabilities: ["crm.upsert"] },
    })
    const { token, tokenRecord } = await mint.json()

    const email = `qa-li-${Date.now()}@example.com`
    const res = await page.request.post("/api/actions/crm.upsert", {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": `qa-li-${Date.now()}` },
      data: { email, name: "QA Lead Intelligence Test", source: "flow" },
    })
    expect(res.status()).toBe(200)

    await page.goto("/portal/leads")
    await expect(page.getByText(email)).toBeVisible()

    await page.request.delete(`/api/integrations/token?id=${tokenRecord.id}`) // cleanup
  })

  test("GW-05 — capability not granted on the token is denied", async ({ page }) => {
    const mint = await page.request.post("/api/integrations/token", {
      data: { label: "qa-narrow-scope", capabilities: ["crm.upsert"] }, // deliberately no notify.slack
    })
    const { token, tokenRecord } = await mint.json()

    const res = await page.request.post("/api/actions/notify.slack", {
      headers: { Authorization: `Bearer ${token}`, "Idempotency-Key": "qa-scope-test" },
      data: { message: "should be denied" },
    })
    expect(res.status()).toBe(403)

    await page.request.delete(`/api/integrations/token?id=${tokenRecord.id}`) // cleanup
  })
})

test("GW-04 — missing/invalid token both rejected", async ({ page }) => {
  const noAuth = await page.request.post("/api/actions/email.send", {
    headers: { "Idempotency-Key": "qa-noauth" },
    data: {},
  })
  expect(noAuth.status()).toBe(401)

  const badAuth = await page.request.post("/api/actions/email.send", {
    headers: { Authorization: "Bearer garbage-token", "Idempotency-Key": "qa-badauth" },
    data: {},
  })
  expect(badAuth.status()).toBe(401)
})
