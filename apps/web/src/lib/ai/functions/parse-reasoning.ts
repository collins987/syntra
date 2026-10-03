import type { AiConfidence } from "@syntra/db"

// Strict parser for the structured text the lead-analysis prompt tells the
// model to emit. If anything deviates from the schema, we fail hard — no
// partial persistence, no best-effort recovery — because partial AI output
// in the UI is worse than no AI output. See AI_LEAD_INTELLIGENCE_PLAN.md §D.

export interface ParsedReasoning {
  summary: string
  observed: string[]
  inferred: string[]
  unknown: string[]
  confidence: AiConfidence
  /** NULL is a valid, encouraged outcome when evidence is too thin. */
  score: number | null
}

export class MalformedResponseError extends Error {
  constructor(reason: string) {
    super(`AI lead analysis malformed: ${reason}`)
    this.name = "MalformedResponseError"
  }
}

const CONFIDENCE_VALUES: readonly AiConfidence[] = ["low", "medium", "high"]

/** Throws MalformedResponseError if the response does not match the schema
 *  exactly. The caller (analyze-lead.ts) catches this and converts it to a
 *  `malformed_response` status with no partial persistence. */
export function parseReasoning(raw: string): ParsedReasoning {
  const text = raw.trim()
  if (!text) throw new MalformedResponseError("empty response")

  // The response must begin with SUMMARY: — not a preamble, not a code fence,
  // not whitespace beyond the leading trim. Strip a single surrounding
  // ```-fence pair if present (some providers wrap structured text in one
  // despite the prompt), but nothing else.
  const unfenced = stripSingleCodeFence(text)

  if (!/^SUMMARY:/i.test(unfenced)) {
    throw new MalformedResponseError("missing SUMMARY block at start of response")
  }

  const summary = extractInline(unfenced, "SUMMARY")
  if (summary === null) throw new MalformedResponseError("SUMMARY block is empty")

  const observed = extractList(unfenced, "OBSERVED")
  const inferred = extractList(unfenced, "INFERRED")
  const unknown = extractList(unfenced, "UNKNOWN")

  const confidenceRaw = extractInline(unfenced, "CONFIDENCE")
  if (confidenceRaw === null) throw new MalformedResponseError("CONFIDENCE block missing or empty")
  const confidence = confidenceRaw.toLowerCase().trim() as AiConfidence
  if (!CONFIDENCE_VALUES.includes(confidence)) {
    throw new MalformedResponseError(
      `CONFIDENCE must be one of ${CONFIDENCE_VALUES.join(", ")} (got ${JSON.stringify(confidenceRaw)})`
    )
  }

  const scoreRaw = extractInline(unfenced, "SCORE")
  if (scoreRaw === null) throw new MalformedResponseError("SCORE block missing or empty")
  const score = parseScore(scoreRaw)

  return { summary, observed, inferred, unknown, confidence, score }
}

function stripSingleCodeFence(text: string): string {
  const fenced = /^```(?:[a-zA-Z0-9_-]+)?\s*\n([\s\S]*?)\n```\s*$/.exec(text)
  return fenced?.[1]?.trim() ?? text
}

// The exact set of block headers the lead-analysis prompt tells the model to
// emit, in order. Having the ordered list up here means extractInline can
// find a block's body by locating its header and reading up to the next
// known header or EOF — avoiding the `$` in multiline mode false-matching
// every line ending.
const BLOCK_HEADERS = ["SUMMARY", "OBSERVED", "INFERRED", "UNKNOWN", "CONFIDENCE", "SCORE"] as const

/** Pulls the value of a block body: everything between `HEADER:` (at start of
 *  line) and the next known header (also at start of line) or EOF. Returns
 *  null if the block is absent or empty. */
function extractInline(text: string, header: string): string | null {
  const upper = header.toUpperCase()
  const startRe = new RegExp(`(^|\\n)${upper}:`, "")
  const startMatch = startRe.exec(text)
  if (!startMatch) return null
  const bodyStart = startMatch.index + startMatch[0].length

  // Find the earliest subsequent header at start-of-line.
  let bodyEnd = text.length
  for (const other of BLOCK_HEADERS) {
    if (other === upper) continue
    const nextRe = new RegExp(`\\n${other}:`, "")
    const nextMatch = nextRe.exec(text.slice(bodyStart))
    if (nextMatch && bodyStart + nextMatch.index < bodyEnd) {
      bodyEnd = bodyStart + nextMatch.index
    }
  }

  const value = text.slice(bodyStart, bodyEnd).trim()
  return value.length > 0 ? value : null
}

/** Pulls the dash-list items under a multi-line block like OBSERVED. An
 *  explicit `- (none)` line is allowed and returns an empty array; the
 *  block header must still be present. Continuation lines (that don't start
 *  with a dash) are joined to the previous item — common when a model
 *  wraps a long bullet across physical lines. */
function extractList(text: string, header: string): string[] {
  const body = extractInline(text, header)
  if (body === null) {
    // The block header itself must exist. Zero items is OK via `- (none)`.
    throw new MalformedResponseError(`${header} block missing or empty — use "- (none)" if there are no items`)
  }
  const rawLines = body
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  const items: string[] = []
  for (const line of rawLines) {
    if (line.startsWith("-")) {
      items.push(line.replace(/^-\s*/, "").trim())
    } else if (items.length > 0) {
      // Wrapped continuation of the previous item.
      items[items.length - 1] = `${items[items.length - 1]} ${line}`
    } else {
      throw new MalformedResponseError(`${header} starts with a non-dash line: ${JSON.stringify(line)}`)
    }
  }

  const nonEmpty = items.filter((l) => l.length > 0)
  // "- (none)" or "- none" means empty.
  if (nonEmpty.length === 1 && /^\(?none\)?$/i.test(nonEmpty[0]!)) return []
  return nonEmpty
}

function parseScore(raw: string): number | null {
  const trimmed = raw.trim()
  if (/^null$/i.test(trimmed)) return null
  if (!/^-?\d+$/.test(trimmed)) {
    throw new MalformedResponseError(`SCORE must be an integer 0..100 or NULL (got ${JSON.stringify(raw)})`)
  }
  const n = Number(trimmed)
  if (!Number.isInteger(n) || n < 0 || n > 100) {
    throw new MalformedResponseError(`SCORE out of range: ${n}`)
  }
  return n
}
