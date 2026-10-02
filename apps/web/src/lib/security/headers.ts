// Security response headers. See PRODUCTION_READINESS_PLAN.md §2.1.
//
// Applied from middleware (not next.config.ts's static headers()) so every
// response — static or dynamic — gets the same treatment from one place.
//
// script-src is deliberately 'self' 'unsafe-inline', not a nonce. A nonce-based
// CSP (Next's own documented "recommended" pattern) was tried first and does not
// work for this app: several marketing pages prerender statically (`○` in the
// build output), and a static HTML file generated once at build time cannot
// contain a nonce that is only known at request time — every one of Next's own
// script tags on those pages ends up with no nonce, or a stale one, and the
// browser blocks its own framework runtime. This was verified against a real
// `next build && next start`, not assumed: every static page failed to load any
// JS under the nonce policy. 'self' has none of that mismatch risk — Next's
// chunks are always same-origin regardless of rendering strategy — at the cost
// of not fully blocking a hypothetical injected inline <script> from XSS. That
// tradeoff is standard for a Next.js App Router site with static pages; a
// hardened nonce policy is realistic only for an app that is dynamic-rendered
// everywhere, which this one deliberately isn't (static pages are faster and
// cheaper to serve).

const PRODUCTION = process.env.NODE_ENV === "production"

function supabaseOrigins(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return []
  try {
    const u = new URL(url)
    // The browser client talks to Supabase over both HTTPS (auth/rest) and a
    // websocket (Realtime, used by the dashboard's live activity feed).
    return [u.origin, `wss://${u.host}`]
  } catch {
    return []
  }
}

/** Sentry's ingest origin, ONLY if a DSN is configured (dev/CI usually have none). */
function sentryOrigin(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return null
  try {
    return new URL(dsn).origin
  } catch {
    return null
  }
}

/**
 * Sentry accepts CSP violation reports directly at a URL derived from the DSN, so
 * the policy still has visibility into what it blocks — see
 * https://docs.sentry.io/security-legal-pii/security/csp/
 */
function sentryReportUri(): string | null {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return null
  try {
    const u = new URL(dsn)
    const projectId = u.pathname.replace(/^\//, "")
    if (!u.username || !projectId) return null
    return `${u.origin}/api/${projectId}/security/?sentry_key=${u.username}`
  } catch {
    return null
  }
}

const REPORT_GROUP = "csp-endpoint"

function buildCsp(): string {
  const connectSrc = ["'self'", ...supabaseOrigins()]
  const sentry = sentryOrigin()
  if (sentry) connectSrc.push(sentry)

  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next dev's HMR/React-refresh client and its default eval-based source-map
    // devtool both execute via eval() — without 'unsafe-eval' here in dev, every
    // client component silently fails to hydrate/attach event handlers at all
    // (confirmed directly: a CSP pageerror fires on every interaction, forms
    // submit natively instead of through React, wiping their own fields).
    // Production builds don't use eval, so this never relaxes the deployed policy.
    "script-src": PRODUCTION ? ["'self'", "'unsafe-inline'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    // React's inline `style={{...}}` attribute and Tailwind's dev-time injected
    // <style> both need 'unsafe-inline' here too — CSP has no practical
    // per-attribute nonce mechanism for inline styles, and style-based script
    // execution has been dead in browsers for years, so this is a narrow gap.
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "img-src": ["'self'", "data:"],
    "connect-src": connectSrc,
    // Sentry's session-replay integration compresses events in a Web Worker it
    // constructs from a blob: URL — without this it silently fails to record
    // replays on error instead of throwing anything obviously attributable.
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'none'"],
    "frame-ancestors": ["'none'"], // the authoritative clickjacking directive
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
  }
  if (PRODUCTION) directives["upgrade-insecure-requests"] = []

  const policy = Object.entries(directives)
    .map(([key, values]) => (values.length ? `${key} ${values.join(" ")}` : key))
    .join("; ")

  const reportUri = sentryReportUri()
  if (!reportUri) return policy
  // Both mechanisms point at the same Sentry endpoint: report-to is the current
  // Reporting API, honoured by Chromium; report-uri is the older, still-working
  // fallback everything else (Safari included) still relies on. Belt and braces
  // costs one extra header, not a second piece of infrastructure.
  return `${policy}; report-to ${REPORT_GROUP}; report-uri ${reportUri}`
}

const CSP = buildCsp()

/** The Reporting API registration the CSP's `report-to` directive points at. */
function buildReportingEndpointsHeader(): string | null {
  const reportUri = sentryReportUri()
  return reportUri ? `${REPORT_GROUP}="${reportUri}"` : null
}

const REPORTING_ENDPOINTS = buildReportingEndpointsHeader()

/**
 * Applies every security header to a response in place. Called on EVERY branch a
 * middleware can return (redirects, 429s, the final passthrough) — a header only
 * one code path remembers to set is a header that silently stops being sent the
 * next time someone edits that file.
 */
export function applySecurityHeaders(response: Response): void {
  response.headers.set("Content-Security-Policy", CSP)
  if (REPORTING_ENDPOINTS) response.headers.set("Reporting-Endpoints", REPORTING_ENDPOINTS)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY") // legacy fallback; frame-ancestors is authoritative
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), usb=(), magnetometer=(), gyroscope=(), interest-cohort=()"
  )
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin")
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin")
  // Not set: Cross-Origin-Embedder-Policy. COEP requires every cross-origin
  // subresource (Google Fonts included) to opt in via CORP/CORS, which is easy to
  // get subtly wrong and breaks the page silently when it does. Its only benefit
  // here would be enabling SharedArrayBuffer, which nothing in this app uses.
  if (PRODUCTION) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    )
  }
}
