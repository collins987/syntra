#!/usr/bin/env node
// Stopgap regression check for lib/security/headers.ts, run in CI right after
// `next build`. There's no test framework in this project yet (see
// PRODUCTION_READINESS_PLAN.md §2.3) — this closes the gap for this one file in
// the meantime: it boots the real production build and asserts the headers a
// future edit could silently drop are still present. Superseded once a real
// test suite exists; delete this file when it is.
//
// Usage: node scripts/verify-security-headers.mjs   (run from apps/web, after `next build`)

import { spawn, execFileSync } from "node:child_process"

const PORT = 4173 // an unlikely-to-collide port, distinct from dev's 3000
const BASE = `http://localhost:${PORT}`

const REQUIRED_HEADERS = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
]

const ROUTES_TO_CHECK = ["/", "/pricing", "/login"]

function waitForServer(timeoutMs) {
  const deadline = Date.now() + timeoutMs
  return new Promise((resolve, reject) => {
    const attempt = async () => {
      try {
        const res = await fetch(BASE, { redirect: "manual" })
        if (res.status) return resolve()
      } catch {
        // not up yet
      }
      if (Date.now() > deadline) return reject(new Error("server did not start in time"))
      setTimeout(attempt, 500)
    }
    attempt()
  })
}

/**
 * On Windows, `shell: true` (needed to resolve npx.cmd) spawns cmd.exe as the
 * direct child — killing that leaves the actual `next start` node process
 * running underneath it. `taskkill /T` kills the whole tree. On POSIX there's
 * no shell wrapper, so a plain SIGKILL is enough.
 */
function killServer(child) {
  if (!child.pid) return
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" })
    } catch {
      // already gone
    }
  } else {
    child.kill("SIGKILL")
  }
}

async function main() {
  const server = spawn("npx", ["next", "start", "--port", String(PORT)], {
    stdio: ["ignore", "pipe", "pipe"],
    shell: process.platform === "win32",
  })

  const failures = []

  try {
    await waitForServer(30_000)

    for (const route of ROUTES_TO_CHECK) {
      const res = await fetch(`${BASE}${route}`, { redirect: "manual" })
      for (const header of REQUIRED_HEADERS) {
        if (!res.headers.get(header)) {
          failures.push(`${route}: missing "${header}" (status ${res.status})`)
        }
      }
    }

    // CSP specifically must still carry a real policy, not an empty/broken string.
    const homeCsp = (await fetch(BASE, { redirect: "manual" })).headers.get(
      "content-security-policy"
    )
    if (!homeCsp || !homeCsp.includes("default-src")) {
      failures.push(`/: content-security-policy looks malformed: "${homeCsp}"`)
    }
  } finally {
    killServer(server)
  }

  if (failures.length > 0) {
    console.error("✗ Security header check failed:\n" + failures.map((f) => `  - ${f}`).join("\n"))
    process.exit(1)
  }
  console.log(`✓ Security headers present on ${ROUTES_TO_CHECK.join(", ")}`)
  process.exit(0)
}

main().catch((err) => {
  console.error("✗ Security header check crashed:", err)
  process.exit(1)
})
