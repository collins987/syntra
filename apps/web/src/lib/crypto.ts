import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto"

// Client credentials live encrypted at rest in org_credentials and are only ever
// decrypted inside the Action Gateway. n8n never receives them.
// See SYNTRA_BUILD_PLAN.md §3 Decision A.

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const VERSION = "v1"

function masterKey(): Buffer {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!raw) {
    throw new Error(
      "CREDENTIAL_ENCRYPTION_KEY is not set. Generate one with: openssl rand -hex 32"
    )
  }
  const key = Buffer.from(raw, "hex")
  if (key.length !== 32) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY must be 64 hex characters (32 bytes)")
  }
  return key
}

/** Returns `v1:<iv>:<authTag>:<ciphertext>`, all hex. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, masterKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [VERSION, iv.toString("hex"), authTag.toString("hex"), ciphertext.toString("hex")].join(":")
}

export function decryptSecret(encoded: string): string {
  const [version, ivHex, tagHex, dataHex] = encoded.split(":")
  if (version !== VERSION || !ivHex || !tagHex || !dataHex) {
    throw new Error("Malformed encrypted credential")
  }
  const decipher = createDecipheriv(ALGORITHM, masterKey(), Buffer.from(ivHex, "hex"))
  decipher.setAuthTag(Buffer.from(tagHex, "hex"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]).toString("utf8")
}

/** Last 4 characters, so the UI can identify a key without decrypting it. */
export function secretHint(plaintext: string): string {
  return plaintext.length <= 4 ? "••••" : `••••${plaintext.slice(-4)}`
}

// ── Workflow tokens ──────────────────────────────────────────────────────────

/** The plaintext is shown once at creation and never stored. */
export function generateWorkflowToken(): { token: string; hash: string } {
  const token = `syn_wf_${randomBytes(24).toString("hex")}`
  return { token, hash: hashToken(token) }
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Stable key so an n8n retry of the same step cannot double-send. */
export function idempotencyKeyFor(executionId: string, step: string): string {
  return createHash("sha256").update(`${executionId}:${step}`).digest("hex").slice(0, 32)
}
