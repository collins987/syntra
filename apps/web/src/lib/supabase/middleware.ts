import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { applySecurityHeaders } from "@/lib/security/headers"
import { checkRateLimit, getClientIp, setRateLimitHeaders } from "@/lib/rate-limit"

/**
 * Copies only cookies (session refresh) from `source` onto `target`.
 *
 * Deliberately NOT a blanket header copy: NextResponse.next() carries Next's own
 * internal x-middleware-next / x-middleware-override-headers markers, and copying
 * those onto a redirect or JSON response confuses Next's middleware runtime into
 * treating the response as a "continue" rather than the terminal response it is.
 */
function copyCookies(target: NextResponse, source: NextResponse): void {
  source.cookies.getAll().forEach((cookie) => target.cookies.set(cookie))
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }))

  applySecurityHeaders(supabaseResponse)

  const pathname = request.nextUrl.pathname

  // Rate limit SYNTRA's own API routes. Keyed by the signed-in user where we have
  // one (fairer than IP for anyone behind a shared office/NAT address); an
  // anonymous caller with no IP header at all (local dev, a non-Vercel host) is
  // left unlimited rather than bucketed under one shared fake identity — that
  // would let the first few such callers lock out every other one behind them,
  // which is the rate limiter causing the very outage it exists to prevent.
  if (pathname.startsWith("/api/")) {
    const clientIp = user ? null : getClientIp(request)
    const identity = user ? `user:${user.id}` : clientIp ? `ip:${clientIp}` : null
    if (identity) {
      const result = await checkRateLimit(pathname, identity)
      if (result.limited) {
        const retryAfterSeconds = result.reset
          ? Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
          : 60
        const response = NextResponse.json(
          { error: "Too many requests. Please slow down and try again shortly." },
          { status: 429 }
        )
        applySecurityHeaders(response)
        copyCookies(response, supabaseResponse)
        response.headers.set("Retry-After", String(retryAfterSeconds))
        setRateLimitHeaders(response, result)
        return response
      }
      // Not limited: still tell a well-behaved caller how much budget is left,
      // so it can back off on its own before ever hitting the 429 above.
      setRateLimitHeaders(supabaseResponse, result)
    }
  }

  // Protect portal and admin routes
  if ((pathname.startsWith("/portal") || pathname.startsWith("/admin")) && !user) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    url.searchParams.set("redirectTo", pathname)
    const response = NextResponse.redirect(url)
    applySecurityHeaders(response)
    copyCookies(response, supabaseResponse)
    return response
  }

  // Redirect logged-in users away from auth pages. /activate/* is a personal-
  // account invite acceptance route (Phase 1) — if a signed-in client lands on
  // one, they'd otherwise re-sign-in as the invitee and overwrite their own
  // session. Bounce them to the dashboard instead; an admin can resend the
  // invite to the correct address.
  if (
    (pathname === "/login" || pathname === "/signup" || pathname.startsWith("/activate/")) &&
    user
  ) {
    const url = request.nextUrl.clone()
    url.pathname = "/portal/dashboard"
    const response = NextResponse.redirect(url)
    applySecurityHeaders(response)
    copyCookies(response, supabaseResponse)
    return response
  }

  return supabaseResponse
}
