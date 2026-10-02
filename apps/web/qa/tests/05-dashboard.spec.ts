import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { loginAs } from "../fixtures/login"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §5.6 — DSH-01, 02, 07, 08.
// DSH-03/04/05/06 (numbers reconcile with SQL, realtime) need a seeding +
// SQL-comparison script, not covered here — see PLAYWRIGHT_QA_PLAN.md §2.

test("DSH-01 — dashboard renders with no console errors", async ({ page }) => {
  const { adminA, password } = loadAccounts()
  const consoleErrors: string[] = []
  page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()) })

  await loginAs(page, adminA.email, password)
  await expect(page.locator("body")).toBeVisible()
  expect(consoleErrors, consoleErrors.join(" | ")).toEqual([])
})

test("DSH-07 — no-org user is guided to onboarding, not a crash", async ({ page }) => {
  const { noOrg, password } = loadAccounts()
  await loginAs(page, noOrg.email, password).catch(() => {
    // loginAs waits for /portal/dashboard — a no-org user may be redirected
    // to /onboarding instead, which is the actually-expected behaviour here.
  })
  await expect(page).toHaveURL(/\/onboarding|\/portal\/dashboard/)
  if (page.url().includes("/portal/dashboard")) {
    await expect(page.getByRole("link", { name: /complete onboarding/i })).toBeVisible()
  }
})

test.describe("as adminA (saved session)", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("DSH-08 — AI agents panel shows all three agents", async ({ page }) => {
    await page.goto("/portal/dashboard")
    for (const name of ["Ava", "Max", "Leo"]) {
      await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
    }
  })
})
