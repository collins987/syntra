import type { Page } from "@playwright/test"

/** Drives the real login form — not a cookie shortcut, so this doubles as a
 *  standing AUTH-02 check on every spec that calls it. */
export async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/login")
  // Next.js server-renders this form with the input's value bound to empty
  // React state; a .fill() that lands before hydration attaches the onChange
  // listener gets silently reverted when React reconciles. networkidle is a
  // reasonable proxy for "hydrated" on a page this simple — confirmed via a
  // screenshot showing exactly this: password filled (typed slightly later),
  // email empty (filled first, before hydration finished).
  await page.waitForLoadState("networkidle")
  await page.getByLabel("Email").fill(email)
  await page.getByLabel("Password", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Sign in" }).click()
  await page.waitForURL(/\/portal\/dashboard/, { timeout: 10_000 })
}
