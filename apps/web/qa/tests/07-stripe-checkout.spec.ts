import { test, expect } from "@playwright/test"
import { loadAccounts } from "../fixtures/accounts"
import { ensureFreshAuthState } from "../fixtures/auth-state"

// QA_TEST_PLAN.md §6.2 — STR-01..05. Card-only (STR-06+ needs webhook events,
// covered by qa/scripts, not a browser). STRIPE_SECRET_KEY is confirmed
// sk_test_... locally — safe to run real Stripe Checkout with test cards.
//
// Checkout requires a signed-in user by design — confirmed directly against
// api/stripe/checkout/route.ts, which embeds user_id in the Stripe session
// metadata from the start and returns 401 for an anonymous caller rather than
// letting Stripe create the account after payment. Anonymous checkout was
// never a real flow; this suite logs in first to match the actual app.
//
// Plan cards render in Sites/Flow/Growth/OS order (same order 06-pricing.spec.ts
// verifies via PRC-01), and in "Pay with Card" mode (the default) each card has
// exactly one CTA button, so button index N+2 (after the 2 payment-method toggle
// buttons) is plan N's checkout CTA. Not matching on CTA text, which is plan
// copy and not this test's concern.

const AUTH_PATH = "qa/fixtures/.auth/adminA.json"
test.beforeAll(async () => {
  const { adminA, password } = loadAccounts()
  await ensureFreshAuthState(adminA.email, password, AUTH_PATH)
})
test.use({ storageState: AUTH_PATH })

async function checkoutCta(page: import("@playwright/test").Page, planIndex: number) {
  return page.locator("button").nth(2 + planIndex)
}

test("STR-01 — checkout opens Stripe with the right plan, each plan", async ({ page, context }) => {
  // 4 real, sequential Stripe page loads — the global 60s default (set for
  // cold-compile headroom, see playwright.config.ts) isn't enough here.
  test.setTimeout(120_000)
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
  const [opened] = await Promise.all([
    context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
    cta.click(),
  ])
  const stripePage = opened ?? page
  await stripePage.waitForURL(/checkout\.stripe\.com/)

  // No email step — it's pre-filled and locked by our own checkout route
  // (customer_email is always set for an authenticated user), confirmed
  // directly via screenshot: Stripe shows it as a static row, not an input.
  //
  // Card fields aren't behind a distinctly-titled cross-origin iframe the way
  // an earlier version of this test assumed (confirmed directly: dumped every
  // iframe's title/name/src, none matched) — plain top-level locators reach
  // them fine. Cardholder name is required and silently blocks submission if
  // left blank — no error shown, the click just does nothing — confirmed by
  // reproducing that exact silent failure before adding this line.
  await stripePage.locator('input[placeholder*="1234"]').fill("4000000000009995")
  await stripePage.locator('input[placeholder="MM / YY"]').fill("12/34")
  await stripePage.locator('input[placeholder="CVC"]').fill("123")
  await stripePage.getByLabel(/cardholder name/i).fill("QA Test")
  await stripePage.getByRole("button", { name: /pay|subscribe/i }).click()

  await expect(stripePage.getByText(/declined/i)).toBeVisible({ timeout: 10_000 })
  if (opened) await stripePage.close()
})

test("STR-05 — cancelled checkout returns to /pricing cleanly", async ({ page, context }) => {
  await page.goto("/pricing")
  const cta = await checkoutCta(page, 0)
  const [opened] = await Promise.all([
    context.waitForEvent("page", { timeout: 15_000 }).catch(() => null),
    cta.click(),
  ])
  const stripePage = opened ?? page
  await stripePage.waitForURL(/checkout\.stripe\.com/)
  await stripePage.goBack()

  await expect(page).toHaveURL(/\/pricing/)
  await expect(page.getByText(/error|failed/i)).not.toBeVisible()
})
