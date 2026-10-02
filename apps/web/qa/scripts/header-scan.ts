// QA_TEST_PLAN.md §8.2 — HDR-01, X-01. No auth needed. Run: pnpm qa:headers
// Works against local dev or production — pass QA_BASE_URL to target either.

import { resolve } from "path"

for (const f of [resolve(__dirname, "../../.env.local"), resolve(__dirname, "../../.env.qa")]) {
  try {
    process.loadEnvFile(f)
  } catch {
    /* see seed-accounts.ts */
  }
}

const base = process.env.QA_BASE_URL ?? "http://localhost:3000"

const REQUIRED = [
  "content-security-policy",
  "x-frame-options",
  "strict-transport-security",
  "referrer-policy",
  "permissions-policy",
  "cross-origin-opener-policy",
  "cross-origin-resource-policy",
]

async function main() {
  const res = await fetch(base, { redirect: "manual" })
  console.log(`[HDR-01/X-01] ${base} → ${res.status}\n`)

  let fail = 0
  for (const header of REQUIRED) {
    const value = res.headers.get(header)
    if (value) {
      console.log(`  PASS  ${header}: ${value}`)
    } else {
      console.error(`  FAIL  ${header} — missing`)
      fail++
    }
  }

  const frameOptions = res.headers.get("x-frame-options")
  if (frameOptions && frameOptions.toUpperCase() !== "DENY") {
    console.error(`  FAIL  x-frame-options is "${frameOptions}", expected DENY`)
    fail++
  }

  console.log(`\n${REQUIRED.length - fail}/${REQUIRED.length} required headers present`)
  if (fail > 0) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
