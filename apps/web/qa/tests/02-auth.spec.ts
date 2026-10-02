import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { loginAs } from "../fixtures/login"

// QA_TEST_PLAN.md §5.3 (AUTH-*) plus D-004/D-017/D-018 regression coverage.

test("AUTH-02/AUTH-03 — login valid vs invalid", async ({ page }) => {
  const { adminA, password } = loadAccounts()

  await page.goto("/login")
  await page.waitForLoadState("networkidle") // see fixtures/login.ts — hydration race otherwise
  await page.getByLabel("Email").fill(adminA.email)
  await page.getByLabel("Password", { exact: true }).fill("definitely-wrong-password")
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page.getByText(/invalid|incorrect/i)).toBeVisible({ timeout: 5_000 })
  await expect(page).toHaveURL(/\/login/) // AUTH-03: no redirect on failure

  await loginAs(page, adminA.email, password)
  await expect(page).toHaveURL(/\/portal\/dashboard/)
})

test("AUTH-05 — logged-in user redirected away from /login and /signup", async ({ page }) => {
  const { adminA, password } = loadAccounts()
  await loginAs(page, adminA.email, password)

  await page.goto("/login")
  await expect(page).toHaveURL(/\/portal\/dashboard/)
  await page.goto("/signup")
  await expect(page).toHaveURL(/\/portal\/dashboard/)
})

test("D-018 — logout works", async ({ page }) => {
  const { adminA, password } = loadAccounts()
  await loginAs(page, adminA.email, password)

  await page.getByRole("button", { name: "Sign out" }).click()
  await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })

  // AUTH-04: session actually cleared, not just a client-side redirect.
  await page.goto("/portal/dashboard")
  await expect(page).toHaveURL(/\/login/)
})

test("D-017 — login page forwards redirectTo to the signup link", async ({ page }) => {
  await page.goto("/login?redirectTo=%2Finvite%2Ftest-token-123")
  const href = await page.getByRole("link", { name: "Get started" }).getAttribute("href")
  expect(href).toBe("/signup?redirectTo=%2Finvite%2Ftest-token-123")
})

test("AUTH-09 / D-004 — deep-link return after login", async ({ page }) => {
  const { adminA, password } = loadAccounts()
  await page.goto("/portal/billing") // anon, should bounce to login with redirectTo
  await expect(page).toHaveURL(/\/login\?redirectTo=%2Fportal%2Fbilling/)
  await page.waitForLoadState("networkidle") // see fixtures/login.ts — hydration race otherwise

  await page.getByLabel("Email").fill(adminA.email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await expect(page).toHaveURL(/\/portal\/billing/, { timeout: 10_000 })
})

test("AUTH-01 — signup form validation (client-side, no real account created)", async ({ page }) => {
  await page.goto("/signup")
  await page.waitForLoadState("networkidle") // see fixtures/login.ts — hydration race otherwise
  await page.getByLabel("Email").fill("not-a-real-address-for-qa@example.com")
  await page.getByLabel("Password", { exact: true }).fill("short")
  await page.getByLabel("Confirm password").fill("short")
  await page.getByRole("button", { name: "Create account" }).click()
  await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
})
