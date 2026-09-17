# SYNTRA — Security & Production-Readiness Plan

| | |
|---|---|
| **Scope** | Phases 1–3, everything under `apps/web`, `packages/*`, `infra/*` |
| **Method** | Full source review of auth, RLS, payments, AI gateway, webhooks, CI, config. No live penetration test — the "Verify" line in each item says how to prove it. |
| **Status** | Planning document. Nothing in here is implemented yet. |
| **Builds on** | `SECURITY_REMEDIATION_PLAN.md` (F-01/02/08/09, migration 010–011) and `F-03_APPROVAL_AUTHORIZATION_PLAN.md` — already fixed, recapped in §1, not repeated here |

---

## 1. Where the project already stands (recap, not new work)

These are done and should stay done — listed so this plan doesn't re-litigate them:

- **F-03** — only a client admin can approve/reject agent actions; DB, API and UI all enforce it.
- **F-01/F-02** — n8n sync and webhook fail closed when their secrets are unset; webhook is timestamp-signed and replay-resistant.
- **F-08** — org members can only read their own org's data; onboarding and payment-linking are fully server-verified.
- **F-09** — platform admin access uses `app_metadata` (server-only), not the self-editable `user_metadata`.
- Client credentials are AES-256-GCM encrypted at rest, decrypted only inside the Action Gateway; n8n holds one scoped, hashed token and no secrets.
- Sentry strips cookies/bodies; session replay masks all text.
- Idempotency exists at three separate layers: Action Gateway (`Idempotency-Key`), approvals (`approval:<id>`), n8n executions (unique index).

The rest of this document is what's still missing.

---

## 2. New findings

Same severity model as the QA plan: **Critical** (exploitable today, real damage), **High** (must fix before real customers), **Medium** (fix in the next cycle), **Low** (hardening/polish).

### 2.1 No HTTP security headers — **High**

`next.config.ts` and `vercel.json` set nothing: no CSP, no `Strict-Transport-Security`, no `X-Content-Type-Options`, no `X-Frame-Options`/`frame-ancestors`, no `Referrer-Policy`, no `Permissions-Policy`. Every response — marketing pages, the portal, API routes — ships with browser defaults only.

**Why it matters:** the portal can be iframed by another site (clickjacking on the approvals/billing pages is the realistic bad case — an attacker could overlay a fake "Approve" button). No CSP means a single XSS anywhere has no second line of defence.

**Fix:** a `headers()` block in `next.config.ts` (or `middleware.ts`, since middleware already runs on every request):

```ts
{
  source: "/:path*",
  headers: [
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ],
},
```
Content-Security-Policy needs care because of Stripe.js, Sentry, and inline styles from Tailwind's JIT — start in **report-only** mode (`Content-Security-Policy-Report-Only`) pointed at a Sentry CSP endpoint, watch it for a week, then flip to enforcing.

> **Implemented as enforcing from the start, not report-only** — every external resource the app actually loads (Supabase, Sentry, Google Fonts) was identified by reading the code first, then the whole policy was verified against a real production build with the browser automation tooling (zero CSP violations, zero failed requests, on every public page). `script-src` ended up `'self' 'unsafe-inline'` rather than the nonce+`strict-dynamic` pattern this section originally sketched — see the comment at the top of `lib/security/headers.ts` for why a nonce doesn't work here (it broke every statically-prerendered page in testing). Sentry's CSP report endpoint is still wired in (`report-uri`), so a violation the pre-launch check missed is still visible, not just silently blocked.

**Verify:** `curl -sI https://www.syntraco.tech | grep -iE "x-frame|strict-transport|content-security"`; securityheaders.com scan.

---

### 2.2 No rate limiting anywhere — **High**

Every endpoint — `/login`, `/signup`, `/reset-password`, `/api/audit`, `/api/ai/chat`, `/api/stripe/checkout`, `/api/intasend/stk-push` — accepts unlimited requests from one IP or one account. Supabase Auth has some platform-level throttling, but nothing else does.

**Concrete abuse cases:**
- Credential stuffing against `/login` — no lockout, no backoff.
- `/api/audit` — no auth required, writes a `leads` row per request; a script can flood your CRM with junk leads or just hammer Resend/Supabase.
- `/api/ai/chat` — the per-org budget (`hard_stop`) stops runaway *spend*, but not a burst of concurrent requests that all land before the budget check catches up, and not a member spamming right up to the budget ceiling every month.
- `/api/intasend/stk-push` — nothing stops a script from firing STK push prompts at an arbitrary phone number in a loop.

**Fix:** `@upstash/ratelimit` + Upstash Redis (free tier is enough to start), applied in `middleware.ts` so it covers every route in one place:
- Auth pages (`/login`, `/signup`, `/reset-password`): 5 requests / 5 min per IP.
- `/api/audit`: 3 / hour per IP.
- `/api/ai/chat`: per-org token-bucket, separate from the USD budget (e.g. 20 requests / 5 min).
- `/api/intasend/stk-push`: 3 / 10 min per phone number *and* per user.
- Global fallback: 100 req/min per IP on `/api/*`.

**Verify:** a small script that fires N+1 requests and asserts the (N+1)th gets `429`.

---

### 2.3 Zero automated tests — **High**

`package.json` has no test runner at all — no Jest/Vitest, no Playwright. CI (`ci.yml`) runs `typecheck`, `lint`, `build` and stops. For a system that moves money and runs AI agents with real-world side effects, there is currently no regression net: a future edit to `lib/ai/policy.ts` or `lib/billing-link.ts` could reopen F-03 or F-08 and nothing would catch it before production.

**Fix, in priority order:**
1. **Vitest** for pure logic, no I/O: `lib/pricing.ts` (`planFromStripePriceId`, `KES_AMOUNTS`), `lib/ai/policy.ts` (`authorizeTool`, `authorizeApprovedAction`, `effectiveAutonomy`), `lib/crypto.ts` (encrypt/decrypt round-trip, token hashing), `lib/auth/secrets.ts` (already hand-verified in this session — formalize those 11 cases into a real test file), `lib/org.ts` (`isOrgAdmin`, `canDecideApprovals`).
2. **An RLS test suite** — the single highest-leverage test category for this app, since every security fix so far has been an RLS policy. A Node script (run against a local `supabase start` instance in CI) that: signs in as two test users in two orgs, and for every table asserts (a) a member can read only their own org's rows, (b) a member cannot write to tables that should be read-only, (c) cross-org writes are refused. This turns "run migration 011 and hope" into a real CI gate.
3. **Playwright e2e** for the two flows where a regression is expensive: signup → onboarding → dashboard, and the approval flow (propose → approve → executes once, reject → nothing executes).
4. Wire all three into `ci.yml` as required jobs, run on every PR.

**Verify:** `pnpm test` exit code gates merges; the RLS suite specifically should fail loudly if anyone reintroduces a `FOR ALL` policy.

---

### 2.4 CI has no security gates — **Medium-High**

`ci.yml` never runs a dependency audit, never scans for committed secrets, and there's no Dependabot/Renovate config, so outdated or vulnerable dependencies (`@anthropic-ai/sdk`, `stripe`, `next` itself) age silently.

**Fix:**
- Add a `pnpm audit --audit-level=high` step (non-blocking warning at first, blocking once the baseline is clean).
- Add `.github/dependabot.yml` for `npm` (weekly) and `github-actions` (monthly).
- Add a secret-scanning step (`gitleaks` GitHub Action) on every PR — cheap, catches an accidentally committed `.env` before it reaches history.

**Verify:** intentionally open a PR that adds a fake `sk_live_...` string to a comment; confirm the gitleaks job fails it.

---

### 2.5 No schema validation library — **Medium**

Every API route hand-rolls its own validation (`typeof x === "string" ? x.trim().slice(0, N) : ""`), which is what this session's own fixes had to add route-by-route (onboarding, billing-link, n8n webhook). It works, but it's easy to miss a field, and there's no single place that defines "what a valid onboarding payload looks like."

**Fix:** adopt `zod`. One schema per route body, parsed once at the top:
```ts
const OnboardingSchema = z.object({
  orgName: z.string().trim().min(2).max(100),
  orgSlug: z.string().trim().max(100).optional(),
  serviceType: z.enum(PLAN_IDS),
  industry: z.string().trim().max(50).default(""),
  projectName: z.string().trim().max(120).default(""),
  goals: z.string().trim().max(2000).default(""),
})
```
A failed parse returns a structured `400` with the exact field that failed, instead of a generic error. Migrate route-by-route; not a rewrite.

**Verify:** existing QA test cases (ONB-11, ONB-12, PAY-\*) should all still pass after migration.

---

### 2.6 No MFA for organisation admins — **Medium-High**

A `CLIENT_ADMIN` can approve irreversible AI actions, manage billing, and hold API credentials for connected integrations, protected by a password alone. Supabase Auth supports TOTP MFA natively — this is a config + one enrollment UI, not a new system.

**Fix:** add a "Two-factor authentication" section to `/portal/settings` → Security tab using `supabase.auth.mfa.enroll()`. Start opt-in; consider requiring it for `CLIENT_ADMIN` once integrations/credentials ship to real customers.

**Verify:** enroll a test account, confirm login prompts for a TOTP code, confirm a stolen password alone can't reach the portal.

---

### 2.7 Weak, inconsistent password policy — **Medium**

Signup (`signup-form.tsx`) only checks `password.length >= 8`, client-side, with no complexity or breach check. Settings' password-change form separately checks uppercase/number — the two don't agree, and neither checks against known-breached passwords.

**Fix:** one shared `lib/auth/password.ts` used by both signup and settings: minimum 10 chars, block the 10k-most-common-passwords list (a static file, no external call needed), and optionally a k-anonymity HaveIBeenPwned check (privacy-preserving, no full password ever leaves the browser). Enforce server-side too — Supabase Auth's project-level password policy setting should be raised to match, since the client check is only a UX nicety today.

**Verify:** try `password123` at signup, confirm it's rejected with a specific reason, not just "too short."

---

### 2.8 No bot/spam protection on public forms — **Medium**

`/signup`, `/audit`, `/contact` are open to scripted submission — no CAPTCHA, no honeypot, no timing check.

**Fix:** Cloudflare Turnstile (free, privacy-respecting, no user-facing puzzle in the common case) on all three forms. Pairs with §2.2's rate limits — Turnstile stops scripted abuse, rate limiting stops volume abuse from a human clicking fast.

**Verify:** automated form-fill script gets rejected without a valid Turnstile token.

---

### 2.9 Audit trail has gaps — **Medium**

`audit_logs` is written from onboarding, agent settings, budget changes, integrations, and approvals — but **not** from `/api/team/invite`, `/api/team/remove`, `/api/org/update`, or invite acceptance. An admin's own actions in three of the most sensitive routes (who has access to the org, and its name/billing identity) leave no trace in `/portal/activity`.

**Fix:** add the same `audit_logs` insert pattern already used elsewhere to these four call sites: `team_invite.sent`, `team_invite.cancelled`, `member.removed`, `member.joined`, `org.renamed`.

**Verify:** invite a member, remove a member, rename the org — confirm all three show up in `/portal/activity`.

---

### 2.10 IntaSend webhook uses a non-constant-time comparison — **Low**

`payload.challenge !== process.env.INTASEND_WEBHOOK_CHALLENGE` is a plain string comparison — the same class of issue fixed for `CRON_SECRET` in F-01. Low severity (a shared static token, not a per-request signature; timing differences here leak far less than the earlier cases), but the fix already exists: swap in the `safeEqual()` helper from `lib/auth/secrets.ts` built during the F-01/F-02 work.

**Verify:** existing MP-08 test in `QA_TEST_PLAN.md` still passes.

---

### 2.11 No CSRF-specific defence beyond cookie SameSite — **Low-Medium**

Supabase SSR's cookies default to `SameSite=Lax`, which blocks the classic cross-site form-POST CSRF case for most routes. Nothing currently double-checks this, and there's no explicit `Origin`/`Referer` check on mutating API routes as a second layer.

**Fix:** confirm (don't assume) the Supabase SSR cookie options in `lib/supabase/middleware.ts` explicitly set `sameSite: "lax"` and `secure: true` in production; add a small `Origin` header check on state-changing `/api/*` routes as defence-in-depth — reject if present and not matching `NEXT_PUBLIC_APP_URL`.

**Verify:** a cross-origin `fetch` with `credentials: "include"` from an attacker page to a mutating endpoint should fail.

---

### 2.12 Dead role types in the schema — **Low**

`user_role` enum includes `SUPER_ADMIN, ADMIN, STAFF, PROJECT_MANAGER, MARKETING_MANAGER, CLIENT_ADMIN, CLIENT_USER`. Application code only ever checks `CLIENT_ADMIN`/`CLIENT_USER` for org membership, and platform staff access is a separate `app_metadata.is_admin` flag unrelated to this enum. The five unused values are a trap for a future contributor who assumes assigning `role: "ADMIN"` does something in `organization_members` — it doesn't, silently.

**Fix:** either implement real internal-staff roles properly scoped (if there's a near-term need for staff with narrower-than-platform-admin access), or shrink the enum to the two values actually used and document platform staff access as `app_metadata` only.

---

### 2.13 No health-check endpoint — **Low**

No `/api/health` for uptime monitoring to hit. `/admin/health` exists but is behind the platform-admin auth gate, so an external uptime monitor can't use it.

**Fix:** a trivial unauthenticated `GET /api/health` that checks Supabase reachability and returns `200`/`503` — 10 minutes of work, immediately useful.

---

## 3. "Best of its kind" — production maturity beyond security

These aren't vulnerabilities; they're the gap between "code-complete" (where `PROGRESS.md` says Phase 3 is) and "a real-world system a stranger would trust with their business."

### 3.1 Observability & operations

| Gap | Fix |
|---|---|
| No uptime/status monitoring | Better Uptime or Checkly hitting `/api/health` (§2.13) and the marketing home; a public status page builds trust with prospects. |
| No structured logging | `console.log`/`console.error` scattered, unstructured. Adopt `pino` for JSON logs; Vercel's log drain can then ship to a real log platform (Axiom, Better Stack) instead of ephemeral function logs. |
| No alerting beyond Sentry error capture | Sentry catches exceptions, not business-signal anomalies (e.g. "0 successful payments in 24h", "AI spend spiked 10x"). Add a couple of Sentry Cron Monitor checks or simple scheduled queries with Slack/email alerts for these. |
| n8n is a single Azure VM — a single point of failure for every automation | Document a restart/health runbook now; consider a managed n8n (n8n Cloud) or a second standby instance once real customers depend on it. This is a scaling note, not urgent at zero customers. |

### 3.2 Backups & disaster recovery

| Gap | Fix |
|---|---|
| No documented backup verification | Confirm Supabase's automated backup tier is actually enabled on the project (not just assumed), and note the retention window. |
| No restore drill ever performed | Do one: restore a Supabase backup into a scratch project, confirm the RLS policies and data come back intact. An untested backup is not a backup. |
| No `CREDENTIAL_ENCRYPTION_KEY` rotation runbook | The `v1:` version prefix in `lib/crypto.ts` already supports this — write the actual rotation procedure (decrypt-with-old, re-encrypt-with-new, bump prefix) before it's needed under pressure. |

### 3.3 Environment isolation

| Gap | Fix |
|---|---|
| `staging`/`development` branches exist in `ci.yml`, but it's unclear if they point at isolated infrastructure | Verify: does `staging` use a separate Supabase project, Stripe **test** mode, and IntaSend sandbox? If staging and production share a Supabase project, a staging test can pollute real customer data. This should be a hard separation before onboarding real customers. |

### 3.4 Compliance & legal

| Gap | Fix |
|---|---|
| No account data export/delete flow | If any EU/UK customers are in scope, GDPR requires a self-service or request-based data export and deletion path. Currently there's no code path for either. |
| No `SECURITY.md` / vulnerability disclosure policy | A one-page `SECURITY.md` with a contact email costs nothing and is expected of "best of its kind." |
| Terms/Privacy pages exist (Phase 2.6) — confirm they match what migration 011 and this plan actually do | E.g. Terms should describe data retention accurately once §3.4's export/delete flow exists. |

### 3.5 Performance

| Gap | Fix |
|---|---|
| Fonts loaded via `@import url(fonts.googleapis.com...)` in `globals.css` | Migrate to `next/font/google` — self-hosts the font files, removes a render-blocking external request, eliminates FOUT, and is a ~10-minute change with a real Lighthouse/CLS win. |
| No bundle-size budget in CI | `next build` output isn't checked against a size budget, so a future dependency can silently bloat the client bundle. Consider `@next/bundle-analyzer` in CI with a soft threshold. |

### 3.6 Accessibility

| Gap | Fix |
|---|---|
| No automated a11y checks | Add `@axe-core/playwright` assertions to the e2e suite once it exists (§2.3) — cheap once Playwright is already running. |

### 3.7 Documentation

| Gap | Fix |
|---|---|
| No `CONTRIBUTING.md` / architecture doc for a new engineer | `PROGRESS.md` is excellent as a build log but reads as a changelog, not onboarding material. A short "how the pieces fit together + where to start" doc lowers the bus factor. |
| No incident-response runbook | When (not if) something breaks in production — a webhook silently failing, a budget miscalculation, a stuck n8n execution — there's no written "who does what" playbook. Doesn't need to be elaborate; one page naming the failure modes already known from this codebase (n8n down, Stripe webhook misconfigured, budget hard-stop triggered) is enough to start. |

---

## 4. Prioritised roadmap

| Order | Item | Section | Effort | Status |
|---|---|---|---|---|
| 1 | Security headers (CSP, HSTS, frame-ancestors, etc.) | 2.1 | Small | **Done** — `lib/security/headers.ts`; shipped enforcing (not report-only — see note below), verified against a real `next build && next start` with zero CSP violations across every public page |
| 2 | Rate limiting on public + payment + AI endpoints | 2.2 | Medium | **Done, needs your Upstash keys** — `lib/rate-limit.ts`; code is live and fail-open when unconfigured. **Does not cover `/login`\|`/signup`\|`/reset-password`** — those call Supabase directly from the browser, bypassing this server entirely; see the note in that file |
| 3 | RLS test suite in CI | 2.3 | Medium |
| 4 | Audit log gaps (team/org routes) | 2.9 | Small |
| 5 | `safeEqual` for IntaSend webhook | 2.10 | Trivial |
| 6 | Health-check endpoint + uptime monitor | 2.13, 3.1 | Trivial |
| 7 | Dependency audit + secret scanning in CI | 2.4 | Small |
| 8 | Zod adoption across API routes | 2.5 | Medium (incremental) |
| 9 | Password policy unification | 2.7 | Small |
| 10 | Bot protection (Turnstile) | 2.8 | Small |
| 11 | MFA enrollment | 2.6 | Medium |
| 12 | Vitest unit suite | 2.3 | Medium (incremental) |
| 13 | Playwright e2e + a11y checks | 2.3, 3.6 | Medium |
| 14 | Environment isolation verification | 3.3 | Verification, not code |
| 15 | Backup restore drill + rotation runbook | 3.2 | Verification + doc |
| 16 | `next/font` migration | 3.5 | Small |
| 17 | GDPR export/delete, `SECURITY.md` | 3.4 | Medium |
| 18 | Dead role enum cleanup | 2.12 | Small |
| 19 | Structured logging, status page, bundle budget | 3.1, 3.5 | Medium |

Items 1–6 are the ones I'd actually push back on shipping to real customers without. 7–13 turn "code-complete" into "trustworthy." 14–19 are what separates "good" from "best of its kind."

---

## 5. What I need from you to proceed

- Confirm whether `staging` currently shares infrastructure with production (§3.3) — I can't see Supabase/Stripe dashboard config from the repo.
- A decision on MFA: opt-in for everyone, or required for `CLIENT_ADMIN` before real customers onboard.
- Whether any customers are (or will be) EU/UK-based, which decides how urgent §3.4's GDPR flow is.
- Sign-off to add `@upstash/ratelimit` and (optionally) `zod` as new dependencies.

Tell me which items to start on and I'll turn them into the same kind of concrete implementation this session already did for F-01/02/03/08/09.
