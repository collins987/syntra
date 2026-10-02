# SYNTRA Playwright QA suite

See `PLAYWRIGHT_QA_PLAN.md` at the repo root for the full plan, the
automation coverage map (which `QA_TEST_PLAN.md` IDs are covered here vs.
manual), and the safety rules. This file is just "how do I run it."

## One-time setup

1. `pnpm dev` running in another terminal (`http://localhost:3000`).
2. Seed accounts have real email addresses you control. Copy
   `.env.qa.example` to `.env.qa` and fill in `QA_EMAIL_ADMIN_A` etc. —
   Gmail `+alias` addresses work fine (`you+qa-admin-a@gmail.com`), same
   inbox, five distinct addresses.
3. `pnpm qa:seed` — creates the 5 test accounts (ADMIN-A/B, USER-A,
   PLATFORM, NO-ORG) via the Supabase admin API (no email confirmation
   needed — see the script's own comment for why that's safe here) and
   writes `qa/fixtures/accounts.generated.json`. Re-running is safe;
   it skips accounts that already exist.

## Running

```bash
pnpm qa:headed          # the whole suite, visible browser (default — see playwright.config.ts)
pnpm qa                 # same, config already sets headless: false
npx playwright test qa/tests/01-public-site.spec.ts --headed   # one file
pnpm qa:report          # open the HTML report from the last run
```

## Known flakiness: Supabase auth rate limits

Confirmed directly (not a guess): running the full suite makes enough real
`signInWithPassword` calls (one per file/account via `auth-state.ts`, by
design — see the comment there) that some runs hit Supabase's own auth rate
limit partway through. Symptom: a test that logs in fine alone fails with a
login timeout in the full run, and *which* test fails changes between runs
with no code changes in between — the signature of a shared rate-limit
budget being exhausted at different points depending on timing, not a real
bug. Two ways to reduce it, neither implemented here: raise the Supabase
project's auth rate limit (dashboard → Auth → Rate Limits, if on a plan that
allows it), or reduce real logins further by minting sessions via the
refresh-token grant instead of a full password sign-in each time. Until
then: expect occasional login-timeout failures on a full run that pass in
isolation — re-run the specific failing spec before treating it as a defect.

## What's NOT in here

- **M-Pesa/IntaSend (MP-\*)** — excluded on purpose. `INTASEND_SANDBOX=false`
  locally with a live-looking key; do not point any automation at that
  until it's a real sandbox key. See `PLAYWRIGHT_QA_PLAN.md` §1.
- **Rate limiting (RL-\*)** — `UPSTASH_REDIS_REST_URL`/`_TOKEN` aren't set
  locally, so rate limiting is disabled app-wide. Specs that touch this
  are written to skip with a clear reason rather than report a false pass.
- **n8n workflow lifecycle, Sentry event inspection, real email delivery
  content** — need infrastructure or a human this suite doesn't have.
  See the coverage map in `PLAYWRIGHT_QA_PLAN.md` §2 (lane C).

## Lane B scripts (not Playwright — curl/SQL-equivalent, run via tsx)

```bash
pnpm qa:rls        # SEC-02..09 cross-tenant REST checks
pnpm qa:gateway    # GW-04..14 Action Gateway idempotency/auth checks
pnpm qa:headers    # HDR-01, X-01 security header presence
```

Each prints PASS/FAIL per `QA_TEST_PLAN.md` ID to stdout — copy results
into that file's Result column same as every other session this project
has done.
