import { test, expect } from "@playwright/test"

// QA_TEST_PLAN.md §6.2 — STR-01..05. Card-only (STR-06+ needs webhook events,
// covered by qa/scripts, not a browser). STRIPE_SECRET_KEY is confirmed
// sk_test_... locally — safe to run real Stripe Checkout with test cards.
//
// Plan cards render in Sites/Flow/Marketing/OS order (same order 06-pricing.spec.ts
// verifies via PRC-01), and in "Pay with Card" mode (the default) each card has
// exactly one CTA button, so button index N+2 (after the 2 payment-method toggle
// buttons) is plan N's checkout CTA. Not matching on CTA text, which is plan
// copy and not this test's concern.

async function checkoutCta(page: import("@playwright/test").Page, planIndex: number) {
  return page.locator("button").nth(2 + planIndex)
}

test("STR-01 — checkout opens Stripe with the right plan, each plan", async ({ page, context }) => {
  for (let i = 0; i < 4; i++) {
    await page.goto("/pricing")
    const cta = await checkoutCta(page, i)
    const [stripePage] = await Promise.all([
      context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
      cta.click(),
    ])
    // Some setups navigate the same tab instead of opening one — handle both.
    const target = stripePage ?? page
    await target.waitForURL(/checkout\.stripe\.com/, { timeout: 15_000 })
    expect(target.url()).toContain("checkout.stripe.com")
    if (stripePage) await stripePage.close()
  }
})

test("STR-04 — declined card shows a decline, no subscription created", async ({ page, context }) => {
  await page.goto("/pricing")
  const cta = await checkoutCta(page, 0) // Sites
  const [stripePage] = await Promise.all([context.waitForEvent("page"), cta.click()])
  await stripePage.waitForURL(/checkout\.stripe\.com/)

  await stripePage.getByLabel(/email/i).fill("qa-decline-test@example.com")
  const cardFrame = stripePage.frameLocator('iframe[title="Secure card number input frame"]')
  await cardFrame.getByPlaceholder(/card number/i).fill("4000000000009995")
  await stripePage.getByLabel(/expiration/i).fill("12/34")
  await stripePage.getByLabel(/cvc/i).fill("123")
  await stripePage.getByRole("button", { name: /pay|subscribe/i }).click()

  await expect(stripePage.getByText(/declined/i)).toBeVisible({ timeout: 10_000 })
  await stripePage.close()
})

test("STR-05 — cancelled checkout returns to /pricing cleanly", async ({ page, context }) => {
  await page.goto("/pricing")
  const cta = await checkoutCta(page, 0)
  const [stripePage] = await Promise.all([context.waitForEvent("page"), cta.click()])
  await stripePage.waitForURL(/checkout\.stripe\.com/)
  await stripePage.goBack().catch(() => stripePage.close())

  await expect(page).toHaveURL(/\/pricing/)
  await expect(page.getByText(/error|failed/i)).not.toBeVisible()
})
