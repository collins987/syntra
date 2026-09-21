/**
 * Only same-origin relative paths. A bare "/" prefix is not enough: "//evil.com"
 * and "/\evil.com" are both read as protocol-relative URLs by browsers, which
 * would turn a post-login/post-signup redirect into an open redirect.
 */
export function safeRedirect(target: string | null, fallback = "/portal/dashboard"): string {
  if (!target) return fallback
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback
  }
  return target
}
