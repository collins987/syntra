import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §7.8 — APR-01..05, 09, 10, 17, BUD-01. The REST-tamper cases
// (APR-11, 12, 16, BUD-06) are in qa/tests/13-gateway.spec.ts; true concurrent
// races (APR-03, 14) aren't here — a browser click can't fire two requests
// close enough together to test a real race honestly.
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

  test("APR-01/02/04 — queue visible, approve and reject both work", async ({ page }) => {
    // Unique per run — approvals carry a 7-day TTL (confirmed via SQL, see
    // QA_TEST_PLAN.md D-020), so a static email across many runs today left
    // multiple leftover pending rows and tripped a strict-mode "2 elements"
    // violation. A fresh address each run means this test only ever matches
    // the row it just created, regardless of how many prior runs piled up.
    const approveEmail = `qa-approve-${Date.now()}@example.com`
    const rejectEmail = `qa-reject-${Date.now()}@example.com`

    // Create two approvals to test both outcomes without needing them to already exist.
    await page.goto("/portal/ai")
    const input = page.locator("#ai-chat-input")

    await input.fill(`Send a test email to ${approveEmail} subject "QA approve test" body "hi"`)
    await input.press("Enter")
    await expect(page.getByText(/approval|queued/i).last()).toBeVisible({ timeout: 30_000 })

    await input.fill(`Send a test email to ${rejectEmail} subject "QA reject test" body "hi"`)
    await input.press("Enter")
    await expect(page.getByText(/approval|queued/i).last()).toBeVisible({ timeout: 30_000 })

    await page.goto("/portal/approvals")
    await expect(page.getByText(approveEmail)).toBeVisible()
    await expect(page.getByText(rejectEmail)).toBeVisible()

    // Reject the second one — nothing should execute.
    const rejectRow = page.getByText(rejectEmail).locator("xpath=ancestor::*[self::div or self::li][1]")
    await rejectRow.getByRole("button", { name: "Reject" }).click()
    await expect(page.getByText(rejectEmail)).not.toBeVisible({ timeout: 10_000 })

    // Approve the first — should move out of "waiting for you".
    const approveRow = page.getByText(approveEmail).locator("xpath=ancestor::*[self::div or self::li][1]")
    await approveRow.getByRole("button", { name: "Approve" }).click()
    await expect(page.getByText(approveEmail)).not.toBeVisible({ timeout: 10_000 })
  })

  test("BUD-01 — usage page renders real numbers, not a crash", async ({ page }) => {
    await page.goto("/portal/ai-usage")
    await expect(page.locator("body")).toBeVisible()
    const body = await page.locator("body").innerText()
    expect(body).not.toMatch(/undefined|NaN/)
  })
})

test.describe("as userA", () => {
  const AUTH_PATH = "qa/fixtures/.auth/userA.json"
  test.beforeAll(async () => {
    const { userA, password } = loadAccounts()
    await ensureFreshAuthState(userA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("APR-09/APR-10 — a member (non-admin) sees a read-only queue", async ({ page }) => {
    await page.goto("/portal/approvals")
    await expect(page.getByRole("button", { name: "Approve" })).toHaveCount(0)
    await expect(page.getByRole("button", { name: "Reject" })).toHaveCount(0)
  })
})
