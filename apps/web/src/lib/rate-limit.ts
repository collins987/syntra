import { Ratelimit } from "@upstash/ratelimit"
// The package's default export resolves to a Node.js build (it reads
// process.version), which the Edge Runtime this file runs in (middleware)
// doesn't support. The "cloudflare" entry is Upstash's fetch-only, Node-free
// build — the one their own docs point to for Next.js Edge Middleware.
import { Redis } from "@upstash/redis/cloudflare"

// Distributed rate limiting for SYNTRA's own API routes. See
// PRODUCTION_READINESS_PLAN.md §2.2 and ITEM_1_2_GAPS_AND_FIX_PLAN.md.
//
// Scope, honestly stated: login, signup and password reset call
// `supabase.auth.*` directly from the browser (see login-form.tsx,
// signup-form.tsx, reset-password/page.tsx) — those requests go straight to
// Supabase's own /auth/v1/* endpoints and never reach this server, so nothing
// here can rate-limit them. Supabase's own platform-level auth throttling is the
// only defence for those today. Everything this file protects is a route under
// this Next.js app: the public lead form, the AI chat gateway, payment linking,
// team invites and the workflow action endpoints.
//
// Why Redis and not an in-memory counter: a Vercel deployment runs many
// serverless/edge instances with no shared memory, so an in-memory limiter would
// only ever throttle the fraction of requests that happen to land on the same
// instance — not a real limit at all. Upstash's Redis is REST/fetch-based, so it
// works from the Edge middleware runtime, which a normal TCP Redis client cannot.
//
// Requires UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (a free database at
// upstash.com). Unconfigured: rate limiting no-ops (warns once) rather than
// blocking all traffic — the same "fail open on missing config, but be loud
// about it" choice already made for other optional integrations in this project.

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null

if (!redis) {
  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — API rate limiting is disabled."
  )
}

function tier(requests: number, window: `${number} ${"s" | "m" | "h"}`, prefix: string) {
  if (!redis) return null
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
    prefix: `syntra:rl:${prefix}`,
  })
}

const TIERS = {
  // Public, unauthenticated, writes a lead — the highest abuse-per-request ratio.
  publicLead: tier(5, "10 m", "public-lead"),
  // Authenticated but each request can spend real Anthropic API budget.
  aiChat: tier(20, "5 m", "ai-chat"),
  // Payment-adjacent: checkout, linking a paid subscription, triggering M-Pesa STK.
  // Each of the routes in this tier gets its OWN bucket (see the pathname in the
  // Redis key below) — this number is the per-route limit, not a pool the five
  // routes in this tier share. A retry against one payment route must never spend
  // down the budget a completely different one needs a moment later.
  payments: tier(10, "10 m", "payments"),
  // Sends an email per call; legitimate use is infrequent.
  invites: tier(10, "1 h", "invites"),
  // Called by n8n (steady, automated traffic) and the manual sync button.
  workflow: tier(300, "1 m", "workflow"),
  // Every other authenticated /api/* route not listed above.
  default: tier(60, "1 m", "default"),
} as const

type TierName = keyof typeof TIERS

interface Rule {
  test: (path: string) => boolean
  tier: TierName
}

// Checked in order; first match wins.
const RULES: Rule[] = [
  { test: (p) => p === "/api/audit", tier: "publicLead" },
  { test: (p) => p === "/api/ai/chat", tier: "aiChat" },
  {
    test: (p) =>
      p === "/api/stripe/checkout" ||
      p === "/api/stripe/link-subscription" ||
      p === "/api/intasend/link-subscription" ||
      p === "/api/intasend/stk-push" ||
      p === "/api/onboarding",
    tier: "payments",
  },
  { test: (p) => p === "/api/team/invite", tier: "invites" },
  { test: (p) => p.startsWith("/api/actions/") || p === "/api/n8n/sync", tier: "workflow" },
]

// Inbound webhooks authenticate by signature, not identity, and are sent by a
// small number of servers we don't control the retry timing of — throttling them
// risks dropping a real Stripe/IntaSend/n8n delivery, which is worse than the
// abuse this file otherwise guards against.
const EXEMPT_PATHS = new Set([
  "/api/stripe/webhook",
  "/api/intasend/webhook",
  "/api/n8n/webhook",
])

export interface RateLimitResult {
  limited: boolean
  /** The tier's configured ceiling — absent when limiting is off or exempt. */
  limit?: number
  remaining?: number
  /** Epoch ms when the window resets — used for Retry-After / RateLimit-Reset. */
  reset?: number
}

export async function checkRateLimit(
  pathname: string,
  identity: string
): Promise<RateLimitResult> {
  if (!redis || !pathname.startsWith("/api/") || EXEMPT_PATHS.has(pathname)) {
    return { limited: false }
  }

  const rule = RULES.find((r) => r.test(pathname))
  const limiter = TIERS[rule?.tier ?? "default"]
  if (!limiter) return { limited: false }

  try {
    // Keyed by route + identity, not identity alone: a tier shared by several
    // routes (like "payments") must give each route its own bucket, or a retry
    // against one silently spends the budget a different, unrelated route needs.
    const { success, limit, remaining, reset } = await limiter.limit(`${pathname}:${identity}`)
    return { limited: !success, limit, remaining, reset }
  } catch (err) {
    // A Redis hiccup must never take the whole API down — fail open, but loudly,
    // so an outage in the rate limiter itself doesn't silently disable it.
    console.error("[rate-limit] check failed, allowing the request:", err)
    return { limited: false }
  }
}

/**
 * The caller's real IP, or null when none can be determined.
 *
 * Header preference, per Vercel's own docs: x-vercel-forwarded-for is Vercel's
 * own value and stays correct even if a proxy (e.g. Cloudflare) is ever added in
 * front of Vercel later — their docs call out that a later proxy could overwrite
 * plain x-forwarded-for before Vercel sees it. Vercel overwrites and strips any
 * client-supplied x-forwarded-for itself (to prevent spoofing) unless the
 * account has their Enterprise "trusted proxy" feature enabled, so either header
 * is trustworthy on this deployment today; x-vercel-forwarded-for is simply the
 * more future-proof one to prefer.
 *
 * Returns null (never a placeholder string) when nothing is present — e.g. local
 * dev, or a non-Vercel host — so the caller can choose not to rate-limit rather
 * than bucket every such request under one shared fake identity, which would let
 * the first few anonymous callers lock out every other one behind them.
 */
export function getClientIp(request: Request): string | null {
  for (const name of ["x-vercel-forwarded-for", "x-forwarded-for", "x-real-ip"]) {
    const value = request.headers.get(name)
    if (value) return value.split(",")[0]!.trim()
  }
  return null
}

/**
 * Sets the current standard-track rate-limit headers (RateLimit-*, RFC-in-draft)
 * plus the older X-RateLimit-* aliases some tooling still looks for, on EVERY
 * response for a limited route — not only the 429. A well-behaved caller
 * (including n8n's own automations against /api/actions/*) can then back off
 * before ever getting blocked, instead of only finding out after the fact.
 * No-ops when there was nothing to report (unconfigured, or an exempt route).
 */
export function setRateLimitHeaders(response: Response, result: RateLimitResult): void {
  if (result.limit === undefined) return
  response.headers.set("RateLimit-Limit", String(result.limit))
  response.headers.set("X-RateLimit-Limit", String(result.limit))
  if (result.remaining !== undefined) {
    response.headers.set("RateLimit-Remaining", String(result.remaining))
    response.headers.set("X-RateLimit-Remaining", String(result.remaining))
  }
  if (result.reset !== undefined) {
    const resetSeconds = Math.max(0, Math.ceil((result.reset - Date.now()) / 1000))
    response.headers.set("RateLimit-Reset", String(resetSeconds))
    response.headers.set("X-RateLimit-Reset", String(resetSeconds))
  }
}
