import { createHash, createHmac, timingSafeEqual } from "node:crypto"

// Shared-secret checks for machine callers (GitHub Actions, n8n).
// See SECURITY_REMEDIATION_PLAN.md §1–2.

/**
 * Constant-time string comparison. Both sides are hashed first so the comparison
 * time reveals neither the content nor the length of the expected value.
 */
export function safeEqual(provided: string | null | undefined, expected: string): boolean {
  if (typeof provided !== "string") return false
  const a = createHash("sha256").update(provided).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b)
}

export type SignatureCheck =
  | { ok: true }
  | { ok: false; reason: "missing" | "malformed" | "stale" | "mismatch" }

/** Signed requests older or newer than this are refused, which bounds replay. */
export const SIGNATURE_TOLERANCE_SECONDS = 300

/**
 * Verifies `sha256=<hex HMAC-SHA256(secret, "<timestamp>.<rawBody>")>`.
 * Binding the timestamp into the MAC stops an attacker refreshing an old request.
 */
export function verifyTimestampedSignature(params: {
  secret: string
  rawBody: string
  timestamp: string | null
  signature: string | null
  now?: number
}): SignatureCheck {
  const { secret, rawBody, timestamp, signature } = params
  if (!timestamp || !signature) return { ok: false, reason: "missing" }

  if (!/^\d{10}$/.test(timestamp)) return { ok: false, reason: "malformed" }
  const match = /^sha256=([0-9a-f]{64})$/i.exec(signature)
  if (!match) return { ok: false, reason: "malformed" }

  const nowSeconds = Math.floor((params.now ?? Date.now()) / 1000)
  if (Math.abs(nowSeconds - Number(timestamp)) > SIGNATURE_TOLERANCE_SECONDS) {
    return { ok: false, reason: "stale" }
  }

  const expected = createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest()
  const provided = Buffer.from(match[1]!, "hex")
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { ok: false, reason: "mismatch" }
  }
  return { ok: true }
}
