import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §7.3 — SET-01..04, TEAM-01, 03, 04, 05.
// TEAM-02/06/07 (accepting an invite) need real inbox access — see
// PLAYWRIGHT_QA_PLAN.md §5, not automated here yet.
//
// Reuses a bootstrapped, warm-refreshed session shared across spec files
// (ensureFreshAuthState) — avoids repeated real password logins, which hit

test.describe("as adminA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("SET-01 — profile display name saves", async ({ page }) => {
    await page.goto("/portal/settings")
    await page.waitForLoadState("networkidle") // see fixtures/login.ts — same fill-before-ready race
    const newName = `QA Admin A ${Date.now()}`
    await page.getByLabel(/display name/i).fill(newName)
    await page.getByRole("button", { name: /save changes/i }).click()
    await expect(page.getByText(/profile updated/i)).toBeVisible({ timeout: 10_000 })
  })

  test("TEAM-01/03 — members list shows real members, duplicate invite is rejected", async ({ page }) => {
    const { userA } = loadAccounts()
    await page.goto("/portal/settings")
    await page.getByRole("button", { name: "Team" }).click()
    await expect(page.getByText(userA.email!).first()).toBeVisible()

    const res = await page.request.post("/api/team/invite", {
      data: { email: userA.email, role: "CLIENT_USER" },
    })
    expect([400, 409]).toContain(res.status())
  })

  test("TEAM-05 — invalid role is rejected", async ({ page }) => {
    const res = await page.request.post("/api/team/invite", {
      data: { email: "someone-new@example.com", role: "PLATFORM_ADMIN" },
    })
    expect(res.status()).toBe(400)
  })

  test("SET-02 — weak password is rejected", async ({ page }) => {
    await page.goto("/portal/settings")
    await page.waitForLoadState("networkidle") // see fixtures/login.ts — same fill-before-ready race
    await page.getByRole("button", { name: "Security" }).click()
    await page.getByLabel(/new password/i).fill("short")
    await page.getByLabel(/confirm password/i).fill("short")
    await page.getByRole("button", { name: /update password/i }).click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })
})

test.describe("as userA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/userA.json"
  test.beforeAll(async () => {
    const { userA, password } = loadAccounts()
    await ensureFreshAuthState(userA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("SET-04 — non-admin cannot update org settings via API", async ({ page }) => {
    const res = await page.request.patch("/api/org/update", { data: { name: "Hijacked Org Name" } })
    expect(res.status()).toBe(403)
  })

  test("TEAM-04 — non-admin cannot invite via API", async ({ page }) => {
    const res = await page.request.post("/api/team/invite", {
      data: { email: "someone-new@example.com", role: "CLIENT_USER" },
    })
    expect(res.status()).toBe(403)
  })
})
