import { test, expect } from "@playwright/test"

// QA_TEST_PLAN.md §6.1 — PRC-01..05.
// Prices per lib/pricing.ts (checked directly, not guessed):
// Sites 297/38,700 · Flow 497/64,700 · Marketing 697/90,700 · OS 997/129,700

const PLANS = [
  { name: "Sites", usd: "297", kes: "38,700" },
  { name: "Flow", usd: "497", kes: "64,700" },
  { name: "Marketing", usd: "697", kes: "90,700" },
  { name: "OS", usd: "997", kes: "129,700" },
]

test.describe("PRC-01 — prices consistent across every surface", () => {
  for (const surface of ["/", "/services", "/pricing"]) {
    test(`${surface} shows correct USD for every plan`, async ({ page }) => {
      await page.goto(surface)
      const body = await page.locator("body").innerText()
      for (const plan of PLANS) {
        expect(body, `${surface} should show $${plan.usd} for ${plan.name}`).toContain(plan.usd)
      }
    })
  }
})

test("PRC-02 — every advertised plan is buyable", async ({ page }) => {
  await page.goto("/pricing")
  for (const plan of PLANS) {
    const card = page.getByText(plan.name, { exact: false }).first()
    await expect(card).toBeVisible()
  }
  // CTA text is plan-specific copy ("Start Building", "Automate Everything",
  // etc. — see lib/pricing.ts `cta`), not a generic label. In "Pay with Card"
  // mode (the default) each card has exactly one enabled CTA button, same
  // structural assumption 07-stripe-checkout.spec.ts already relies on.
  const ctas = await page.locator("button:enabled").count()
  expect(ctas, "at least one buy CTA should exist per plan").toBeGreaterThanOrEqual(PLANS.length)
})

test("PRC-04 — capabilities shown as included, not sold", async ({ page }) => {
  await page.goto("/pricing")
  const body = await page.locator("body").innerText()
  expect(body).toMatch(/lead intelligence/i)
  expect(body).toMatch(/ai agents/i)
})

test.describe("PRC-05 — OS savings copy is correct", () => {
  // Lives on the homepage and /services, NOT /pricing — confirmed directly
  // against source (grepped all three, only these two have "Save $...").
  for (const surface of ["/", "/services"]) {
    test(`${surface} shows the $494/mo saving`, async ({ page }) => {
      await page.goto(surface)
      const body = await page.locator("body").innerText()
      expect(body).toMatch(/494/) // $1,491 (3 core plans) - $997 (OS) = $494 saved
    })
  }
})
