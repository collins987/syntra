import { test, expect } from "@playwright/test"

// QA_TEST_PLAN.md §5.2 — WEB-01..08. No auth needed.

const PAGES = [
  "/",
  "/services",
  "/pricing",
  "/about",
  "/contact",
  "/audit",
  "/case-studies",
  "/legal/privacy",
  "/legal/terms",
]

test.describe("WEB-01 — public pages load", () => {
  for (const path of PAGES) {
    test(`${path} loads with no console errors`, async ({ page }) => {
      const consoleErrors: string[] = []
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text())
      })
      const failedRequests: string[] = []
      page.on("requestfailed", (req) => failedRequests.push(`${req.method()} ${req.url()}`))

      const response = await page.goto(path)
      expect(response?.status(), `${path} should return 200`).toBe(200)
      await expect(page.locator("body")).toBeVisible()

      // Broken <img> — a decoded natural width of 0 on a rendered image.
      const brokenImages = await page
        .locator("img")
        .evaluateAll((imgs) => imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0).length)
      expect(brokenImages, `${path} should have no broken images`).toBe(0)

      expect(consoleErrors, `${path} console errors: ${consoleErrors.join(" | ")}`).toEqual([])
      expect(failedRequests, `${path} failed requests: ${failedRequests.join(" | ")}`).toEqual([])
    })
  }
})

test("WEB-03 — home services section shows all 3 plans + OS", async ({ page }) => {
  await page.goto("/")
  for (const name of ["Sites", "Flow", "Marketing"]) {
    await expect(page.getByText(name, { exact: false }).first()).toBeVisible()
  }
})

test("WEB-04 — no horizontal scroll at 390px", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  for (const path of ["/", "/pricing", "/services"]) {
    await page.goto(path)
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ])
    expect(scrollWidth, `${path} should not overflow horizontally at 390px`).toBeLessThanOrEqual(clientWidth + 1)
  }
})

test("WEB-05 — no fabricated proof claims", async ({ page }) => {
  await page.goto("/")
  const body = await page.locator("body").innerText()
  for (const claim of ["workflows automated", "98.7% uptime", "3× average ROI"]) {
    expect(body, `should not contain fabricated claim "${claim}"`).not.toContain(claim)
  }
})

test("WEB-06 — metadata", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/SYNTRA/)
})

test("WEB-02 — no dead nav/footer links", async ({ page }) => {
  // Next dev compiles each route on first visit — can genuinely take >30s
  // cold. Not representative of production, but real for this harness.
  test.setTimeout(90_000)
  await page.goto("/")
  const hrefs = await page.locator("a[href^='/']").evaluateAll((links) =>
    Array.from(new Set(links.map((l) => (l as HTMLAnchorElement).getAttribute("href")).filter(Boolean)))
  )
  for (const href of hrefs as string[]) {
    if (href.startsWith("/portal") || href.startsWith("/admin") || href.includes("[")) continue // guarded/dynamic, covered elsewhere
    const response = await page.request.get(href, { timeout: 60_000 })
    expect(response.status(), `link ${href} should not 404/500`).toBeLessThan(400)
  }
})
