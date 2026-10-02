import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §5.4 — GRD-01..04. Anonymous + non-admin route guards.

const PORTAL_ROUTES = [
  "/portal/dashboard",
  "/portal/activity",
  "/portal/ai",
  "/portal/ai-agents",
  "/portal/ai-usage",
  "/portal/analytics",
  "/portal/approvals",
  "/portal/automations",
  "/portal/billing",
  "/portal/clients",
  "/portal/integrations",
  "/portal/leads",
  "/portal/marketing",
  "/portal/reports",
  "/portal/settings",
  "/portal/websites",
]

const ADMIN_ROUTES = ["/admin", "/admin/economics", "/admin/health", "/admin/clients", "/admin/leads", "/admin/subscriptions", "/admin/ai"]

test.describe("GRD-01 — portal guarded for anonymous", () => {
  for (const route of PORTAL_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})

test.describe("GRD-02 — admin guarded for anonymous", () => {
  for (const route of ADMIN_ROUTES) {
    test(`${route} redirects to /login`, async ({ page }) => {
      await page.goto(route)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})

test.describe("GRD-03", () => {
  const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
  test.beforeAll(async () => {
    const { adminA, password } = loadAccounts()
    await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
  })
  test.use({ storageState: AUTH_PATH })

  test("admin guarded for a non-platform-admin org member", async ({ page }) => {
    for (const route of ["/admin", "/admin/economics", "/admin/health"]) {
      await page.goto(route)
      await expect(page, `${route} must not be reachable by a non-admin`).not.toHaveURL(new RegExp(route.replace("/", "\\/")))
      // Confirm no platform data leaked into the DOM before the redirect took effect.
      const body = await page.locator("body").innerText().catch(() => "")
      expect(body).not.toMatch(/gross contribution|org_cost_ledger/i)
    }
  })
})

test("GRD-04 — onboarding guarded for anonymous", async ({ page }) => {
  await page.goto("/onboarding")
  await expect(page).toHaveURL(/\/login/)
})
