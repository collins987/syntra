import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §7.9 (PG-01..10) and §6.6 (PRT-01..04). Generic per-page
// checks: loads without console errors, no data from another org leaks in.
//
// Reuses a bootstrapped, warm-refreshed session shared across spec files
// (ensureFreshAuthState) — avoids repeated real password logins, which hit
const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
test.beforeAll(async () => {
  const { adminA, password } = loadAccounts()
  await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
})
test.use({ storageState: AUTH_PATH })

const ROUTES = [
  "/portal/dashboard",
  "/portal/automations",
  "/portal/growth",
  "/portal/analytics",
  "/portal/reports",
  "/portal/clients",
  "/portal/integrations",
  "/portal/activity",
  "/portal/settings",
  "/portal/billing",
  "/portal/websites",
  "/portal/leads",
  "/portal/ai-agents",
]

for (const route of ROUTES) {
  test(`${route} loads clean, no cross-org data`, async ({ page }) => {
    const consoleErrors: string[] = []
    page.on("console", (msg) => { if (msg.type() === "error") consoleErrors.push(msg.text()) })
    const failedRequests: string[] = []
    page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()}`))

    await page.goto(route)
    await expect(page.locator("body")).toBeVisible()

    const body = await page.locator("body").innerText()
    expect(body, `${route} should never show "QA Org B"`).not.toContain("QA Org B")

    expect(consoleErrors, `${route} console errors: ${consoleErrors.join(" | ")}`).toEqual([])
    expect(failedRequests, `${route} failed requests: ${failedRequests.join(" | ")}`).toEqual([])
  })
}

test("PG-05 — 30-day leads figure matches across Analytics, Growth, Reports", async ({ page }) => {
  const numbers: Record<string, string | null> = {}
  for (const [key, route] of [
    ["analytics", "/portal/analytics"],
    ["growth", "/portal/growth"],
    ["reports", "/portal/reports"],
  ] as const) {
    await page.goto(route)
    const match = await page.locator("body").innerText()
    const found = match.match(/(\d[\d,]*)\s*leads?/i)
    numbers[key] = found?.[1] ?? null
  }
  const values = Object.values(numbers).filter(Boolean)
  if (values.length === 3) {
    expect(new Set(values).size, `lead counts should match: ${JSON.stringify(numbers)}`).toBe(1)
  } else {
    test.skip(true, `Could not locate a "N leads" figure on all 3 pages — found: ${JSON.stringify(numbers)}`)
  }
})
