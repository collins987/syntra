# SYNTRA — Playwright QA Automation Plan

| | |
|---|---|
| **Status** | DRAFT — for review before any test runs |
| **Date** | 2026-09-29 |
| **Relationship to `QA_TEST_PLAN.md`** | This plan does not replace it. It's the execution plan for automating as much of its 284 cases as a browser (plus supporting curl/SQL scripts) genuinely can, and for saying plainly, case by case, what can't be. Results still get written back into `QA_TEST_PLAN.md`'s Result column and Defect Log — this doc doesn't duplicate that bookkeeping. |
| **Target environment** | **Local dev first** (`pnpm dev`, `http://localhost:3000`). A second, narrower pass against production comes later, after a deliberate safety review — see §9. |

---

## 1. What's blocking a clean run today

Checked directly against `apps/web/.env.local` before writing anything else. These match what `QA_TEST_PLAN.md` §4 (Stage 0) already flags — repeated here because they'll silently skew Playwright results if not fixed first, not just manual ones.

| Blocker | Impact on this plan | Action needed |
|---|---|---|
| `UPSTASH_REDIS_REST_URL`/`_TOKEN` not set | Every RL-\* test (§8.2) is unrunnable locally — rate limiting is disabled, not just untestable. Playwright would report false passes ("no 429 appeared") for the wrong reason. | Set both vars locally, or explicitly mark RL-\* `BLOCKED` rather than let a script report a misleading pass. |
| `INTASEND_SANDBOX=false` with a live-looking key | **Do not automate any M-Pesa (MP-\*) flow against this config.** A headless/headed browser clicking "Pay with M-Pesa" here can move real money. | Must be flipped to a real sandbox key before MP-\* is in scope for automation. Until then, MP-\* stays out of the Playwright suite entirely — not even a dry-run. |
| `CREDENTIAL_ENCRYPTION_KEY` (per `QA_TEST_PLAN.md` ENV-05, last checked empty) | Blocks GW-\* (credential storage) if still true. | Re-check before running that section; if still empty, GW-01…03 stay `BLOCKED`, not `FAIL`. |
| No test accounts exist yet (ADMIN-A, ADMIN-B, USER-A, PLATFORM, NO-ORG per `QA_TEST_PLAN.md` §2.1) | Almost every portal/admin test needs one of these. | §4 below creates them as a fixture step, not ad hoc per test. |

None of these are Playwright's problem to solve — they're environment gaps. Flagging them now so a first run doesn't produce a wall of misleading failures.

---

## 2. Automation coverage map

This is the honest split the earlier question was about. Every ID range from `QA_TEST_PLAN.md` sorted into one of three lanes:

**A — Playwright, UI-driven.** A real browser click/type/assert. This is what §22–26 of the pasted prompt actually describes.

**B — Playwright + API/curl/SQL assist.** The browser drives the user-facing half; a script alongside it hits `/rest/v1/*`, `/api/*`, or Stripe's CLI to set up state, force an edge case (webhook signature, RLS cross-tenant read), or verify a DB row the UI never shows. Still automated, just not browser-only.

**C — Manual only, or explicitly out of scope for this pass.** Needs a human (reading a real email inbox, scanning a phone camera for an M-Pesa STK push, judging visual polish), needs infrastructure this plan doesn't stand up (a second real IP, n8n VM state changes), or is unsafe to automate against real services (live payment keys, Sentry event inspection).

| `QA_TEST_PLAN.md` section | Lane | Notes |
|---|---|---|
| §5.1 Build/CI (BLD-01…08) | C | Shell commands, not browser tests. Already run directly in the prior session (BLD-07, BLD-08 done 2026-09-24). Out of this suite. |
| §5.2 Public site (WEB-01…08) | **A** | Straightforward — page loads, links, responsive, metadata. Lighthouse (WEB-08) via `@axe-core/playwright` or a separate Lighthouse CI step, not Playwright itself. |
| §5.3 Auth (AUTH-01…09) | **A**, with B for AUTH-06/07 (needs the real reset email — see §5 below on email access) | Signup, login, logout (D-018), deep-link return (D-004/D-017) are all clickable and assertable. |
| §5.4 Route guards (GRD-01…05) | **A** for GRD-01…04 (visit while logged out, assert redirect). **B** for GRD-05 (`curl -X POST` against each API route — this is a curl loop, not a browser). |
| §5.5 RLS/security (SEC-01…09) | **B**, mostly not A | These are REST calls with raw JWTs (`curl ... -H "Authorization: Bearer $JWT_B"`), not browser interactions. Playwright can hold two authenticated `BrowserContext`s (Org A, Org B) to grab real session tokens, then a Node script fires the REST calls. SEC-07 (grep JS bundles for secrets) is a shell step against the built output, not Playwright at all. |
| §5.6 Dashboard (DSH-01…08) | **A**, with B for DSH-03/04/06 (insert a row via service-role script, then assert the UI reflects it — realtime isolation needs two contexts open simultaneously) |
| §6.1 Pricing consistency (PRC-01…05) | **A** | Pure UI text comparison across pages. |
| §6.2 Stripe (STR-01…16) | **A** for checkout UI (Stripe test cards work fine in an automated flow — `4242 4242 4242 4242` etc. typed into Stripe's hosted Checkout iframe). **B** for webhook-triggered ones (STR-08, 10-14) — those need `stripe trigger`/`stripe listen`, run as a companion script, not clicked. |
| §6.3 M-Pesa (MP-01…10) | **C — out of scope until `INTASEND_SANDBOX` is fixed** | See blocker table above. Do not build this suite against the current config. |
| §6.4 Audit/lead scoring (AUD-01…09) | **A**, with B for AUD-08 (checking `/admin/leads`) already covered by A once PLATFORM context exists |
| §6.5 Onboarding (ONB-01…10) | **A**, with B for ONB-08 (double-click / concurrent submit — Playwright can literally double-fire the click, but confirming "exactly one org" needs a DB count) |
| §6.6 Portal pages from Phase 2 (PRT-01…04) | **A** |
| §7.1 Sentry (SEN-01…05) | **C** | Requires reading the Sentry dashboard, not the app. Out of scope for Playwright; leave manual. |
| §7.2 Resend email (EML-01…06) | **B/C** | Sending is automatable (trigger the action in the browser); *confirming delivery* needs either a real inbox (Gmail, checked manually) or a test inbox service (Mailtrap/Mailosaur) if you want this fully automated. Plan assumes manual inbox check unless you want to wire up a test-inbox API — flagging as a decision, not assuming it. |
| §7.3 Settings/team/invites (SET-\*, TEAM-\*) | **A**, with B for TEAM-06/07 needing the real invite email link (same email-access question as EML-\*) |
| §7.4 Activity/admin (ACT-\*, ADM-01…07) | **A** |
| §7.5 n8n (N8N-01…09) | **C**, mostly | Needs a real n8n VM to create/toggle workflows and force failures. N8N-01/02 (curl against `/api/n8n/sync`) are B. The rest stay manual/n8n-side. |
| §7.6 Action Gateway (GW-01…14) | **B**, heavily | This is almost entirely `curl` with `Idempotency-Key` headers, concurrent requests, and SQL checks on `action_log`/`org_credentials`. Playwright's role is limited to GW-01 (mint a token through the UI). |
| §7.7 AI Gateway (AI-01…13) | **A** for the chat UI itself (already manually verified working per prior session — this formalizes it into a repeatable test). **B** for AI-03 (cross-tenant, needs two contexts) and AI-06/09/10 (checking `ai_requests`/`action_log` rows). |
| §7.8 Approvals/budget (APR-\*, BUD-\*) | **A** for the queue UI (approve/reject/queue visibility — already manually proven working this session for several of these). **B** for the REST-tamper cases (APR-11, 12, 16, BUD-06) and races (APR-03, 14 — Playwright can fire two `page.click()`s near-simultaneously, but the real race is better done as two raw `fetch()`/curl calls). |
| §7.9 Portal pages (PG-01…10) | **A** |
| §8 Cross-cutting (X-01…07) | **A** for X-02…06. X-01 (curl headers) and X-07 are B/spot-check. |
| §8.1 Security remediation retest | **B**, same shape as §5.5 |
| §8.2 Headers & rate limiting (HDR-\*, RL-\*) | **B** | Header presence is a curl loop against built output; RL-\* needs Upstash configured (see blocker table) — `BLOCKED` until then, in Playwright's report too. |
| §9 E2E journeys | **A + B combined** | These are the payoff of building A and B first — E2E-01/02/04 chain UI actions with the supporting scripts already built for their component pieces. |

Rough shape: **lane A is a genuinely large, valuable Playwright suite** (roughly a third to half of the 284 cases). Lane B is real automation too, just not `page.click()` — a `scripts/qa/` folder of Node scripts using `fetch`/Supabase service client, run alongside Playwright, sharing the same test-account fixtures. Lane C stays manual and is listed so nobody assumes it's covered.

---

## 3. Setup

Nothing installed yet — confirmed directly (`apps/web/package.json` has no `@playwright/test`, no `playwright.config.*` anywhere in the repo).

```bash
cd apps/web
pnpm add -D @playwright/test
npx playwright install chromium   # headed mode only needs one real browser, not all three
```

`playwright.config.ts` (new, in `apps/web/`):

```ts
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./qa/tests",
  timeout: 30_000,
  fullyParallel: false, // ordering matters: fixtures create orgs/data other tests depend on
  retries: 0,           // a flaky pass hides a real bug; report failures honestly per the brief
  reporter: [["html", { outputFolder: "qa/report" }], ["list"]],
  use: {
    baseURL: process.env.QA_BASE_URL ?? "http://localhost:3000",
    headless: false,        // per your explicit request — visible the whole run
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
```

Directory layout:

```
apps/web/qa/
  tests/
    01-public-site.spec.ts       # WEB-*
    02-auth.spec.ts              # AUTH-*, D-004, D-017, D-018
    03-guards.spec.ts            # GRD-01..04
    04-onboarding.spec.ts        # ONB-*
    05-dashboard.spec.ts         # DSH-*
    06-pricing.spec.ts           # PRC-*
    07-stripe-checkout.spec.ts   # STR-01..07, 09, 15, 16
    08-audit.spec.ts             # AUD-*
    09-settings-team.spec.ts     # SET-*, TEAM-*
    10-ai-chat.spec.ts           # AI-01, 02, 04, 05, 07, 12, 13
    11-approvals-budget.spec.ts  # APR-01..05, 08..10, 15, 17, BUD-01, 03
    12-portal-pages.spec.ts      # PG-*, PRT-*
    13-admin.spec.ts             # ADM-01..07, ACT-*
    14-responsive.spec.ts        # X-02..06, WEB-04
    15-e2e-journeys.spec.ts      # E2E-01, 02 (card only), 04
  scripts/                       # Lane B — not Playwright, run via `node` or `tsx`
    seed-accounts.ts             # creates ADMIN-A/B, USER-A, PLATFORM, NO-ORG once
    rls-cross-tenant.ts          # SEC-02..09 REST calls with real JWTs
    gateway-idempotency.ts       # GW-04..14 curl-equivalent fetch calls
    webhook-signing.ts           # N8N-05/06, STR-08 style signed-POST tests
    header-scan.ts               # HDR-01, X-01
  fixtures/
    accounts.ts                  # exported {email, password, orgId} for each alias, written by seed-accounts.ts
  qa-report/                     # Playwright HTML report + traces (gitignored)
```

`package.json` additions (`apps/web`):

```json
"qa": "playwright test",
"qa:headed": "playwright test --headed",
"qa:report": "playwright show-report qa/report"
```

---

## 4. Test accounts & seed data

Built once, reused by every spec — not recreated per test (that's how ONB-03's "duplicate slug" scenario stays a deliberate test rather than an accident every other spec trips over).

`scripts/seed-accounts.ts` uses the Supabase **service role** client directly (same pattern already used throughout the app — `createServiceClient()`) to:

1. Create 5 real auth users: `qa-admin-a@<your domain>`, `qa-user-a@...`, `qa-admin-b@...`, `qa-platform@...`, `qa-noorg@...` — real addresses you control, per `QA_TEST_PLAN.md` §2.1's own instruction, so invite/reset emails are checkable when needed.
2. Onboard ADMIN-A → "QA Org A", ADMIN-B → "QA Org B" via the real onboarding API (not a raw insert — this doubles as an ONB-01 pass on every seed run).
3. Add USER-A to Org A via the real invite-accept path (doubles as TEAM-07).
4. Set PLATFORM's `app_metadata.is_admin = true` directly (this one *does* need a raw update — there's no UI path to grant yourself platform admin, by design, per D-009).
5. Leave NO-ORG signed up but never onboarded.
6. Write everything to `fixtures/accounts.ts`.

This script is idempotent — re-running it checks for existing rows before creating, so it's safe to run before every full suite execution.

---

## 5. The email-access decision

Several cases (AUTH-06/07, TEAM-02/06, ONB-10, EML-\*) need to read a real email that arrives after an action. Two honest options, not resolved yet:

- **Manual check** — the script gets you to "email sent, check your inbox," then pauses; you open Gmail, grab the link, paste it into a prompt or a fixture file the next run reads. Zero new infrastructure, but not hands-off.
- **A test-inbox service** (Mailtrap, Mailosaur, or Gmail's own API against a dedicated test account with a service account/app password) — fully automated, but it's new infrastructure and a new credential to manage, and someone has to decide it's worth setting up before real customers rather than during.

Not deciding this for you — flagging it because the plan's completeness depends on it. If you want full automation, tell me which service and I'll wire it in; otherwise the affected specs are written to pause with a clear on-screen instruction rather than silently skip.

---

## 6. Execution phases

Mirrors `QA_TEST_PLAN.md` §10's own order, adapted for what's actually being run:

1. **Fix blockers** (§1 above) or explicitly accept them as `BLOCKED` for this run.
2. **Install & scaffold** (§3).
3. **Seed accounts** (§4) — run once, verify `fixtures/accounts.ts` looks right before anything else runs.
4. **Lane A suite, desktop viewport** — `01` through `13` in order (later specs assume earlier ones left the app in a known state — e.g., `05-dashboard` assumes `04-onboarding` already created data to assert against).
5. **Lane B scripts** — run alongside/after, tagged with which `QA_TEST_PLAN.md` IDs they cover.
6. **Responsive pass** (`14-responsive.spec.ts`) — same specs from step 4, re-run against `tablet`/`mobile` projects where `QA_TEST_PLAN.md` calls for it (WEB-04, X-03/04, PG-\* "mobile at 390px").
7. **E2E journeys** (`15-e2e-journeys.spec.ts`) — last, chaining what's already proven to work piece by piece.
8. **Write results back into `QA_TEST_PLAN.md`** — Section 11 (Results summary) and Section 12 (Defect Log) get updated from the Playwright HTML report + script output, the same way this session already did for AI-02, APR-01/02, D-014 etc. Not duplicated into a second report — one source of truth.

Every failure gets triaged per the pasted brief's §26 before it's called a bug: reproduce, inspect the actual network/console evidence, determine which layer (UI, API, DB) is actually responsible, *then* log it — same discipline already used this session for the OpenRouter 402 and the Resend rejection.

---

## 7. Safety rules carried over from the brief (non-negotiable, apply locally too)

- Test data is obviously test data (`qa-admin-a@...`, "QA Org A") — never anything that could be mistaken for a real customer record.
- Destructive actions (member removal, invite cancellation, subscription cancellation) get **verified as reachable and correctly gated**, not blindly executed in a loop — each runs at most once, deliberately, in a spec that expects it.
- No real card is ever used, even locally — Stripe's documented test cards only (`4242...` etc.), which is what `STRIPE_SECRET_KEY=sk_test_...` already confirms is safe here.
- **M-Pesa/IntaSend stays out of the suite entirely** until `INTASEND_SANDBOX` is fixed — see §1. This isn't a "be careful" note, it's a hard exclusion.
- No secrets (JWTs, service-role key, API keys) get written into the Playwright HTML report or committed anywhere — `fixtures/accounts.ts` holds test account emails/passwords only, and that file should be gitignored even though the accounts are throwaway.

---

## 8. The production pass (later, per your answer — not part of this build)

Once the local suite is clean, a second, deliberately narrower run against `https://www.syntraco.tech` — not a blind re-point of `QA_BASE_URL`. Before that happens:

- Re-review which specs are even eligible — anything that creates real data (onboarding a new org, sending a real invite, submitting the real lead-intake form) either gets skipped against prod or redirected at a designated QA org that's allowed to accumulate test junk.
- Stripe/M-Pesa stay in test mode even against the prod *domain* if at all possible (Stripe supports test-mode checkout against a live site); if that's not achievable cleanly, those specs are excluded from the prod pass, full stop.
- This is a separate go/no-go conversation, not an assumption baked into this plan.

---

## 9. What I need from you before I start building the actual spec files

1. Confirm the blockers in §1 — fix `UPSTASH_*` and re-check `CREDENTIAL_ENCRYPTION_KEY` locally, or accept those sections as `BLOCKED` for this pass.
2. Pick an approach for §5 (email access) — manual pause, or a test-inbox service (and which one).
3. Real email addresses you control for the 5 seed accounts (or confirm I should use a `+qa-a@`/`+qa-b@` style alias off one inbox you already own).
4. Green light to start with `03-guards.spec.ts` / `07-stripe-checkout.spec.ts` first (highest-value, least ambiguous) once the above is settled, or a different starting order if you'd rather see something else first.
