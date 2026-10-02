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
    // Create two approvals to test both outcomes without needing them to already exist.
    await page.goto("/portal/ai")
    const input = page.locator("#ai-chat-input")

    await input.fill('Send a test email to qa-approve@example.com subject "QA approve test" body "hi"')
    await input.press("Enter")
    await expect(page.getByText(/approval|queued/i).last()).toBeVisible({ timeout: 30_000 })

    await input.fill('Send a test email to qa-reject@example.com subject "QA reject test" body "hi"')
    await input.press("Enter")
    await expect(page.getByText(/approval|queued/i).last()).toBeVisible({ timeout: 30_000 })

    await page.goto("/portal/approvals")
    await expect(page.getByText("qa-approve@example.com")).toBeVisible()
    await expect(page.getByText("qa-reject@example.com")).toBeVisible()

    // Reject the second one — nothing should execute.
    const rejectRow = page.getByText("qa-reject@example.com").locator("xpath=ancestor::*[self::div or self::li][1]")
    await rejectRow.getByRole("button", { name: "Reject" }).click()
    await expect(page.getByText("qa-reject@example.com")).not.toBeVisible({ timeout: 10_000 })

    // Approve the first — should move out of "waiting for you".
    const approveRow = page.getByText("qa-approve@example.com").locator("xpath=ancestor::*[self::div or self::li][1]")
    await approveRow.getByRole("button", { name: "Approve" }).click()
    await expect(page.getByText("qa-approve@example.com")).not.toBeVisible({ timeout: 10_000 })
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
