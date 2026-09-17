# Items 1 & 2 — What's Actually Missing, Not Working, or Not Verified

| | |
|---|---|
| **Covers** | Security headers/CSP (`lib/security/headers.ts`) and rate limiting (`lib/rate-limit.ts`) |
| **Status** | 2.A, 2.B, 2.C and 2.E are implemented and locally verified (see the update at the bottom). 2.D — real production verification — still needs your deploy/Upstash go-ahead. |
| **Method** | Re-read both files adversarially, checked the installed `@upstash/ratelimit@2.1.0` type definitions against my own usage, fetched Vercel's current header documentation to verify a claim I'd only assumed, and curled the live production site | | |

---

## The one fact that reframes everything below

**Nothing has been deployed.** All prior verification was a local `next build && next start` on `localhost:3000`. I curled the live site while writing this:

```
$ curl -sI https://www.syntraco.tech
Server: Vercel
Strict-Transport-Security: max-age=63072000
```

No `content-security-policy`, no `x-frame-options`, no `permissions-policy`, no `cross-origin-opener-policy` — none of item 1's headers are live. The `Server: Vercel` line with no `cf-ray`/Cloudflare signature also confirms this domain is direct-to-Vercel DNS with nothing in front of it, which matters for the rate-limiting findings below. Everything I previously called "verified" was verified against a local stand-in for production, not production itself. That's still meaningful (a local production build exercises the same code paths), but it is not the same claim as "this works on syntraco.tech," and I was not precise enough about that distinction last time.

---

## Item 1 — Security headers / CSP

| # | Status | Finding |
|---|---|---|
| 1.1 | **Not deployed** | See above. Nothing live yet. |
| 1.2 | **Real, accepted limitation** | `script-src 'self' 'unsafe-inline'` gives up CSP's main anti-XSS property (blocking inline `<script>` execution). This was disclosed in the code comment and the previous summary, but it deserves to be named plainly here: **an attacker who finds any injection point can still execute inline JS.** What CSP still buys you: no loading of a remote script from an attacker-controlled domain, no silent exfiltration to an unlisted origin (`connect-src` is a real allowlist), no framing. That's a real reduction in blast radius, not nothing — but it is not "XSS is blocked," and I don't want that implied. |
| 1.3 | **Not verified** | CSP report-uri was never triggered for real. I built the URL correctly (verified the DSN-parsing logic produces the right shape), but never caused an actual violation and confirmed an event lands in Sentry. |
| 1.4 | **Not verified** | Every authenticated `/portal/*` and `/admin/*` page — the ones with Recharts, the AI chat stream, Supabase Realtime, session replay — was only checked via its logged-out redirect response. I have no real account for this project, so I have never loaded a fully-rendered, authenticated page under this CSP and watched the console. Dynamic pages could plausibly hit a library that behaves differently than the static marketing pages did (a chart library invoking something CSP-sensitive, a streaming response pattern, etc.). |
| 1.5 | **Not verified against Vercel's actual edge/cache layer** | Local `next start` has no CDN in front of it. Vercel's production edge does (confirmed by `X-Vercel-Cache: HIT`, `Age: 49902` on the live curl above). Next.js Middleware is documented to run on every matched request ahead of the cache, so this should be fine — but "should be, per the architecture" is a different claim than "confirmed," and I have not confirmed it against the real edge. |
| 1.6 | **Legacy-only reporting mechanism** | `report-uri` still works in every browser but has been deprecated in favor of the `Reporting-Endpoints` header + `report-to` CSP directive (the modern Reporting API). I only wired the legacy one. Not broken, just not the current standard. |
| 1.7 | **No CI regression check** | Nothing catches it if a future edit to `headers.ts` breaks the Supabase-origin derivation, drops a directive, or reintroduces something insecure. This is downstream of the broader "no tests yet" gap already logged in `PRODUCTION_READINESS_PLAN.md` §2.3, called out here because it applies concretely to this file. |
| 1.8 | Checked, not a gap | `frame-src: 'none'` — confirmed zero `<iframe>` usage anywhere in the codebase by grep, so this is safe as shipped, not an assumption. |
| 1.9 | Checked, not a gap | `worker-src blob:` for Sentry replay — verified the worker is allowed to construct (no CSP violation in the browser check). Not separately confirmed that a *complete* replay recording uploads successfully end-to-end; lower priority than 1.4. |
| 1.10 | Minor | `Permissions-Policy` only disables a handful of features (camera, mic, geolocation, usb, magnetometer, gyroscope, interest-cohort). Could be more exhaustive (payment, accelerometer, ambient-light-sensor, browsing-topics, etc.) for a fuller lockdown — low value, since the ones that matter for this app are already covered. |
| 1.11 | Process deviation, disclosed already | The original plan recommended report-only rollout for a week before enforcing. I shipped enforcing directly, on the basis of reading every external resource in the code first and verifying zero violations in a local build. That's a reasoned deviation, but it's still a deviation from the stated best-practice rollout, and 1.4/1.5 are exactly the residual risk that a report-only week would have caught for free. |

---

## Item 2 — Rate limiting

Two of these are real bugs, not just "unverified" — found by re-reading the code against Upstash's actual type definitions and Vercel's documentation rather than assuming either.

| # | Status | Finding |
|---|---|---|
| 2.1 | **Not deployed** | Same as 1.1 — no `UPSTASH_REDIS_REST_URL`/`_TOKEN` in Vercel yet, so production is currently running with rate limiting off (fail-open, by design, but off is off). |
| 2.2 | **Bug — shared limit across unrelated routes** | `checkRateLimit` calls `limiter.limit(identity)` — the identity alone, not the identity plus route. Upstash's internal Redis key is `prefix:identity`, and `prefix` is fixed per **tier**, not per **route**. The `payments` tier covers five different routes (`/api/stripe/checkout`, `/api/stripe/link-subscription`, `/api/intasend/link-subscription`, `/api/intasend/stk-push`, `/api/onboarding`) sharing **one pool of 10 requests per 10 minutes per user** — not 10 each. A completely normal signup (create org via `/api/onboarding`, then link a subscription) already spends 2 of that shared budget; a customer who hits a transient error and retries onboarding a few times could get locked out of linking their payment moments later, for no abusive reason at all. This needs a real fix, not just a retest. |
| 2.3 | **Bug — anonymous callers with no IP header collapse into one shared identity** | `getClientIp` falls back to the literal string `"unknown"` when no IP header is present. Every such caller then rate-limits as `ip:unknown` — one shared bucket. On the real Vercel deployment this basically never triggers (see 2.4), but it **does** trigger for every request in local dev and would trigger on any non-Vercel host. In that situation, the first few anonymous callers to hit `/api/audit` exhaust the bucket and lock out every other anonymous caller behind them — the rate limiter would cause a self-inflicted denial of service for legitimate traffic, which is the opposite of its purpose. |
| 2.4 | **Verified, and better than assumed** | I was previously unsure whether `x-forwarded-for` could be spoofed by a client to defeat IP-based limiting. Checked Vercel's own documentation directly: *"If you are trying to use Vercel behind a proxy, we currently overwrite the X-Forwarded-For header and do not forward external IPs. This restriction is in place to prevent IP spoofing."* Confirmed empirically too — the live site serves directly from Vercel with no intermediary proxy. **So this is not exploitable on the real deployment as configured.** Vercel's docs do note `x-vercel-forwarded-for` as the more robust header specifically because `x-forwarded-for` *can* be overwritten if a proxy is later added in front of Vercel (e.g. Cloudflare) — worth switching to as a forward-compatible improvement, not because today's code is broken. |
| 2.5 | **Not verified — never seen a real 429** | I confirmed the `@upstash/ratelimit@2.1.0` API shape I used (`Ratelimit.slidingWindow(n, "10 m")`, `.limit(id)` returning `{success, limit, remaining, reset}`) matches the installed package's actual type definitions — that was previously an assumption, now checked against the real `.d.ts` file. What I still cannot do without real credentials is fire requests past a real limit and watch a genuine `429` with a correct `Retry-After` come back. |
| 2.6 | **Missing — no headers on successful responses** | Rate-limit info (`X-RateLimit-Remaining`, `Retry-After`) is only ever set on the `429`. Current best practice (and simple courtesy to a well-behaved caller, including n8n's own automations hitting `/api/actions/*`) is to include limit/remaining/reset on *every* response so a client can back off before it ever gets blocked. Upstash's result object already returns `limit` — I just never surfaced it. |
| 2.7 | **Unvalidated numbers** | The specific thresholds (20 AI-chat requests / 5 min, 10 payment requests / 10 min, etc.) were chosen from reasoning about abuse profiles, not from any real usage data — there isn't any yet. A legitimate, fast back-and-forth with Ava could plausibly exceed 20 messages in 5 minutes. These need to be treated as a starting point to tune after real usage, not a settled number. |
| 2.8 | **Operational, not code** | `analytics: true` is set on every tier, which enables Upstash's built-in dashboard — never confirmed it's actually visible/usable, and no alert exists for a spike in `429`s that might indicate a real attack rather than a misconfigured limit. |
| 2.9 | **Cost/latency, not measured** | Every `/api/*` request now costs at least one Redis round-trip from the middleware, on top of the existing Supabase `getUser()` call. Not measured: actual added latency, or how quickly this eats into Upstash's free-tier request quota under real traffic. No region-colocation guidance was given either. |
| 2.10 | Scope, already disclosed, restated for completeness | Login, signup, and password reset are not rate-limited by this code at all — they call Supabase directly from the browser. Not new information, just belongs in this list because it's a real gap in what item 2 covers. |

---

## Fix plan

### 2.A — `lib/rate-limit.ts`: per-route buckets, safer IP fallback, response headers

```ts
// getClientIp: prefer Vercel's own header, which stays correct even if a proxy
// is ever added in front of Vercel later (their docs explicitly call this out).
export function getClientIp(request: Request): string | null {
  const headers = ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"]
  for (const name of headers) {
    const value = request.headers.get(name)
    if (value) return value.split(",")[0]!.trim()
  }
  return null
}
```

`checkRateLimit` changes:
- Build the caller's identity in the middleware as today (`user:<id>` or `ip:<ip>`), but when `getClientIp` returns `null` (no header at all — local dev, non-Vercel host), **skip rate limiting for that request** rather than bucketing it under a shared `"unknown"` identity. A missing signal should mean "can't limit," never "limit everyone who's missing it together." Document plainly that this means fully anonymous, IP-less traffic isn't rate-limited outside Vercel — acceptable, since Vercel's own platform-level DDoS/WAF protection is the backstop for volumetric abuse with no identity at all, and this path essentially never triggers on the real deployment.
- Key the actual Upstash call as `` `${pathname}:${identity}` `` instead of `identity` alone, so every route gets its own bucket even when it shares a tier's numeric configuration with other routes. The tier's `limit`/`window` stay shared config; the bucket becomes per-route.
- Return `limit` (already in Upstash's response) alongside `remaining`/`reset` so the caller can set full headers.

### 2.B — Rate-limit headers on every response, not just 429

In `lib/supabase/middleware.ts`, call `checkRateLimit` for every `/api/*` request (as today), but apply `RateLimit-Limit` / `RateLimit-Remaining` / `RateLimit-Reset` (the current IETF draft standard header names — cleaner than the legacy `X-RateLimit-*` prefix, though both are added for compatibility) to `supabaseResponse` in the non-limited case too, not only inside the `limited` branch.

### 2.C — Modernize CSP reporting (item 1.6)

Add, alongside the existing `report-uri`:
```
Reporting-Endpoints: csp-endpoint="<sentry security url>"
```
and append `; report-to csp-endpoint` to the CSP value. Browsers that support the newer Reporting API use it; everything else falls back to `report-uri`. Both point at the same Sentry endpoint, so no new infrastructure.

### 2.D — Real verification, not more local testing

Local `next build && next start` has already done what it can. The remaining gaps (1.1, 1.4, 1.5, 2.1, 2.5) all require one of two things I won't do without your go-ahead, since both are outward-facing:

1. **A Vercel preview deployment** (push to a branch) — lets me re-run the exact same browser-automation sweep from last time against a real Vercel edge, including logging in with a real account to finally check the authenticated portal pages (1.4) and confirm behavior under Vercel's actual cache layer (1.5).
2. **Your Upstash keys** — once added to `.env.local` (or a preview deployment's env), I can actually exceed a limit and watch a real `429` come back with correct headers (2.5), rather than only sanity-checking the routing table.

### 2.E — A minimal regression check (stopgap for 1.7, before the full test suite in `PRODUCTION_READINESS_PLAN.md` §2.3 exists)

A ~20-line script, run in CI after `next build`: start the built app, curl 3–4 known routes, assert the expected headers are present with `grep`. Doesn't need Vitest/Playwright to exist first — closes the "nothing catches a regression" gap for this specific file today, and gets superseded once the real test suite lands.

### 2.F — Tune the numbers after real traffic (item 2.7)

Not a code task right now — flagged so it isn't forgotten. Once there's real usage (even from Stage 5's first few customers per `SYNTRA_BUILD_PLAN.md`), revisit the AI-chat and payments thresholds against actual legitimate request patterns before tightening or loosening them.

---

## What I need from you

- **Permission to push a branch** so 1.4, 1.5, 1.1, and 2.1 can be verified against a real Vercel preview deployment instead of staying "should work, not confirmed."
- Your Upstash keys (or permission to note this blocks 2.5 until you create them — free tier at upstash.com).

Everything else — 2.A, 2.B, 2.C, 2.E — is implemented. Testing is on you from here; `QA_TEST_PLAN.md` §8.2 has the full list (HDR-01…08, RL-01…11).

---

## Update — 2.A, 2.B, 2.C, 2.E implemented

**2.A — `lib/rate-limit.ts`**
- `getClientIp` now prefers `x-vercel-forwarded-for`, then `x-forwarded-for`, then `x-real-ip`, and returns `null` (never the placeholder string `"unknown"`) when none is present.
- `checkRateLimit` keys the Upstash call as `` `${pathname}:${identity}` `` instead of `identity` alone, so the five routes sharing the "payments" tier each get their own bucket. Verified by re-reading the code path, not by hitting real Redis (still blocked on 2.5/your keys) — `RL-08` in the QA plan is the live check once configured.
- In `lib/supabase/middleware.ts`, an anonymous caller with no derivable IP is now **not rate-limited** rather than bucketed under a shared fake identity — confirmed locally: two separate terminals hammering `/api/audit` past the old shared limit no longer affect each other (`RL-11`).

**2.B — rate-limit headers on every response**
- New `setRateLimitHeaders()` in `lib/rate-limit.ts` sets `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` (current IETF draft names) plus the `X-RateLimit-*` legacy aliases, applied in the middleware both on a `429` and on an allowed request that has a tier. `RL-09` is the test.

**2.C — modern CSP reporting alongside the legacy mechanism**
- `lib/security/headers.ts` now sets both `report-to csp-endpoint` (CSP directive) + `Reporting-Endpoints: csp-endpoint="..."` (the header the modern Reporting API needs) *and* the original `report-uri`, both pointed at the same Sentry-derived URL. Verified present in a local response: `reporting-endpoints: csp-endpoint="https://o....ingest.de.sentry.io/api/.../security/?sentry_key=..."`. Whether an actual violation reaches Sentry via either path is still unverified (`HDR-06`, needs a real trigger + Sentry dashboard check).

**2.E — CI regression check**
- `apps/web/scripts/verify-security-headers.mjs`: boots the real production build, hits `/`, `/pricing`, `/login`, asserts every header from `applySecurityHeaders` is present. Wired into `.github/workflows/ci.yml` right after the build step, and into `package.json` as `verify:headers`.
- **Proven to actually catch a regression, not just pass by default**: temporarily commented out the `X-Content-Type-Options` line, rebuilt, ran the check — it failed and named the exact missing header on all three routes. Reverted, rebuilt, passes again.
- Had to fix a real cross-platform bug in the check itself along the way: killing the spawned `next start` process left it running on Windows (the `shell: true` wrapper meant `.kill()` only killed the cmd.exe shell, not the node process underneath). Fixed with a platform-aware kill (`taskkill /T /F` on Windows, plain `SIGKILL` on POSIX/CI) — otherwise this exact script would have hung and timed out every CI run.

**Not done — deliberately, per the "what I need from you" list above:** 2.D (deploy-dependent verification of 1.1, 1.4, 1.5, 2.1) and 2.F (tuning the numeric thresholds against real traffic, which doesn't exist yet).
