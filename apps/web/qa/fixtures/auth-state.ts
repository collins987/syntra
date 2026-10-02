import { chromium } from "@playwright/test"
import { existsSync } from "fs"
import { loginAs } from "./login"

const baseURL = process.env.QA_BASE_URL ?? "http://localhost:3000"

// @playwright/test's managed `chromium` auto-applies the calling describe
// block's test.use({ storageState }) as a default to any newPage() call,
// even from beforeAll — confirmed directly (ENOENT trying to read the very
// file this function exists to create/reuse). Always override it back to
// none; each function below decides its own storageState explicitly.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function freshPageOptions(extra: Record<string, unknown> = {}): any {
  return { baseURL, storageState: undefined, ...extra }
}

/**
 * Logs in fresh via a real password sign-in and writes storageState to disk.
 * Only call this to *bootstrap* an account the first time — every repeat call
 * is a real signInWithPassword, and that's exactly what hits Supabase's own
 * auth rate limit when done once per spec file (confirmed directly: which
 * test fails from this shifts between runs with no code changes, the
 * signature of a shared rate-limit budget running out at different points).
 * Prefer ensureFreshAuthState for anything after the first login.
 */
export async function refreshAuthState(email: string, password: string, outPath: string) {
  const browser = await chromium.launch()
  const page = await browser.newPage(freshPageOptions())
  await loginAs(page, email, password)
  await page.context().storageState({ path: outPath })
  await page.close()
  await browser.close()
}

/**
 * Bootstraps an account with a real password login only once (if outPath
 * doesn't exist yet or the saved session turns out to be fully dead), then on
 * every later call just "warms" the existing session: loads a page with the
 * saved cookies and lets the app's own middleware (lib/supabase/middleware.ts
 * — a standard @supabase/ssr `getUser()` call) silently exchange the refresh
 * token for a new access token and rewrite the cookies. That's the
 * refresh_token grant, not the password grant — it isn't subject to the same
 * rate limit, so this is what every spec file's beforeAll should call instead
 * of refreshAuthState once an account has been bootstrapped at least once.
 */
export async function ensureFreshAuthState(email: string, password: string, outPath: string) {
  if (!existsSync(outPath)) {
    await refreshAuthState(email, password, outPath)
    return
  }

  const browser = await chromium.launch()
  const page = await browser.newPage(freshPageOptions({ storageState: outPath }))
  await page.goto("/portal/dashboard")

  if (page.url().includes("/login")) {
    // The refresh token itself is also dead (not just the access token) —
    // fall back to one real password login to re-bootstrap.
    await loginAs(page, email, password)
  }

  await page.context().storageState({ path: outPath })
  await page.close()
  await browser.close()
}
