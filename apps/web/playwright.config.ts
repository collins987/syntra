import { defineConfig, devices } from "@playwright/test"

// See PLAYWRIGHT_QA_PLAN.md at the repo root for what this suite covers, what
// it deliberately doesn't (M-Pesa/IntaSend — see qa/README.md), and how its
// results map back onto QA_TEST_PLAN.md's test IDs.
export default defineConfig({
  testDir: "./qa/tests",
  // Next dev compiles each route on first visit — genuinely >30s cold for a
  // route nothing has hit yet this run (confirmed directly: WEB-02 and GRD-03
  // both timed out on a route's first visit, passed instantly once warm).
  // Not representative of production (BLD-04 already covers a real build).
  timeout: 60_000,
  fullyParallel: false, // ordering matters: fixtures create orgs/data other tests read
  workers: 1,
  retries: 0, // a flaky pass hides a real bug — see PLAYWRIGHT_QA_PLAN.md §7
  reporter: [["html", { outputFolder: "qa/report", open: "never" }], ["list"]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:3000",
    headless: false,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    { name: "tablet", use: { ...devices["iPad (gen 7)"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
})
