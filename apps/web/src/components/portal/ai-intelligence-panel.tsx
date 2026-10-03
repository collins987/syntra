"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Panel, StatusBadge, timeAgo, type StatusTone } from "./primitives"
import type { AiConfidence } from "@syntra/db"

// AI Intelligence panel — contextual analysis only. Everything in this
// component is a sibling to, never a replacement for, the deterministic
// qualification panel next to it. Labels are deliberately plain and never
// use "true", "real", "final" or "AI-corrected" — see
// AI_LEAD_INTELLIGENCE_PLAN.md §J.

export interface AiAnalysisView {
  aiScore: number | null
  reasoning: string | null
  confidence: AiConfidence | null
  model: string | null
  analyzedAt: string | null
  analysisVersion: string | null
  /** True when the analysis belongs to an older prompt/schema version than
   *  the one the app currently ships — rendered as a stale banner. */
  stale: boolean
}

const CONFIDENCE_TONE: Record<AiConfidence, StatusTone> = {
  low: "warning",
  medium: "cyan",
  high: "success",
}

/** Server-side-rendered server state the panel can override after a successful
 *  analyze click. Kept minimal — the panel does not maintain a chat/history. */
export function AiIntelligencePanel({
  leadId,
  initial,
  isAdmin,
}: {
  leadId: string
  initial: AiAnalysisView
  isAdmin: boolean
}) {
  const router = useRouter()
  const [current, setCurrent] = useState<AiAnalysisView>(initial)
  const [status, setStatus] = useState<{ tone: StatusTone; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  async function onAnalyze(force: boolean) {
    setStatus(null)
    startTransition(async () => {
      let res: Response
      try {
        res = await fetch(`/api/leads/${leadId}/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ force }),
        })
      } catch {
        setStatus({ tone: "error", text: "Could not reach the AI service" })
        return
      }

      // Non-success HTTP codes come straight from Phase 1c's STATUS_CODES
      // mapping — 401 unauthenticated, 403 non-admin or blocked.
      if (res.status === 401) {
        setStatus({ tone: "error", text: "Session expired — sign in again" })
        return
      }
      if (res.status === 403) {
        setStatus({ tone: "error", text: "Only an admin can run AI analysis" })
        return
      }

      let body: {
        status?: string
        result?: {
          status?: string
          aiScore?: number | null
          reasoning?: string | null
          confidence?: AiConfidence | null
          model?: string | null
          analyzedAt?: string | null
          analysisVersion?: string | null
          error?: string
        }
        error?: string
      } = {}
      try {
        body = await res.json()
      } catch {
        setStatus({ tone: "error", text: "Unexpected response from AI service" })
        return
      }

      // body.result.status is the one that matters — it carries the whole
      // LeadAnalysisStatus from analyze-lead.ts.
      const result = body.result
      const inner = result?.status

      if (inner === "success" || inner === "cached") {
        setCurrent({
          aiScore: result?.aiScore ?? null,
          reasoning: result?.reasoning ?? null,
          confidence: result?.confidence ?? null,
          model: result?.model ?? null,
          analyzedAt: result?.analyzedAt ?? null,
          analysisVersion: result?.analysisVersion ?? null,
          stale: false,
        })
        setStatus({
          tone: inner === "cached" ? "cyan" : "success",
          text: inner === "cached" ? "Reused last analysis (inputs unchanged)" : "Analysis complete",
        })
        router.refresh()
        return
      }

      // Explicit, user-safe messages per failure state — never leak a
      // provider stack trace or raw error.
      if (inner === "budget_exhausted") {
        setStatus({ tone: "warning", text: "AI budget for this month is used up" })
        return
      }
      if (inner === "rate_limited") {
        setStatus({ tone: "warning", text: "AI service is busy — try again shortly" })
        return
      }
      if (inner === "malformed_response") {
        setStatus({ tone: "warning", text: "AI returned an unreadable response — try again" })
        return
      }
      if (inner === "invalid_lead") {
        setStatus({ tone: "error", text: "This lead could not be found" })
        return
      }
      if (inner === "cross_org") {
        setStatus({ tone: "error", text: "This lead is outside your organisation" })
        return
      }
      if (inner === "provider_error") {
        setStatus({ tone: "error", text: "AI service is temporarily unavailable" })
        return
      }
      setStatus({ tone: "error", text: body.error ?? "Analysis failed" })
    })
  }

  const hasAnalysis = current.analyzedAt !== null
  const parsed = parseReasoning(current.reasoning)
  const buttonLabel = hasAnalysis ? "Re-analyze with AI" : "Analyze with AI"

  return (
    <Panel
      title="AI Intelligence"
      description="Contextual analysis to help human review — not a replacement for qualification."
      actions={
        isAdmin ? (
          // force=false: let the server's input-hash cache decide. If the
          // lead's signals haven't changed since the last analysis, the
          // click resolves to "Reused last analysis (inputs unchanged)"
          // without a provider call. Force is reserved for an explicit
          // escape hatch that is not yet exposed in Phase 1d.
          <button
            type="button"
            onClick={() => onAnalyze(false)}
            disabled={pending}
            className="h-8 rounded-md border border-border-subtle bg-bg-elevated px-3 text-xs font-medium text-text-primary transition-colors hover:border-cyan-500/40 hover:text-cyan-300 disabled:opacity-50"
          >
            {pending ? "Analyzing…" : buttonLabel}
          </button>
        ) : null
      }
    >
      <div className="space-y-5 px-6 py-5">
        {current.stale && hasAnalysis && (
          <div className="rounded-md border border-warning-400/30 bg-warning-400/5 px-3 py-2 text-xs text-warning-400">
            This analysis is from an earlier version and may be out of date. Re-analyze to refresh.
          </div>
        )}

        {status && (
          <StatusBadge tone={status.tone}>
            <span>{status.text}</span>
          </StatusBadge>
        )}

        {!hasAnalysis ? (
          <p className="text-sm text-text-muted">
            No AI analysis yet.
            {isAdmin
              ? " Click Analyze with AI to run one."
              : " Ask an admin to run an analysis for this lead."}
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                  AI score
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-text-primary">
                  {current.aiScore ?? "—"}
                </p>
                <p className="mt-1 text-[11px] text-text-disabled">Contextual, not qualification</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                  Confidence
                </p>
                <div className="mt-1">
                  {current.confidence ? (
                    <StatusBadge tone={CONFIDENCE_TONE[current.confidence]}>
                      <span className="capitalize">{current.confidence}</span>
                    </StatusBadge>
                  ) : (
                    <span className="text-sm text-text-disabled">—</span>
                  )}
                </div>
              </div>
            </div>

            {parsed.summary && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                  Summary
                </p>
                <p className="mt-1 text-sm text-text-primary">{parsed.summary}</p>
              </div>
            )}

            <ReasoningList label="Observed" items={parsed.observed} />
            <ReasoningList label="Inferred" items={parsed.inferred} />
            <ReasoningList label="Unknown" items={parsed.unknown} />

            <p className="pt-2 font-mono text-[11px] text-text-disabled">
              {current.model ?? "—"} · analyzed {timeAgo(current.analyzedAt)}
            </p>
          </>
        )}
      </div>
    </Panel>
  )
}

function ReasoningList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <ul className="mt-1 space-y-1 text-sm text-text-muted">
        {items.map((item, idx) => (
          <li key={idx} className="pl-2">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Shallow block parser for display only — tolerant of a stored response the
 *  app's own parse-reasoning.ts also accepts. If the stored text is empty
 *  or unparseable, returns empty arrays so the panel degrades to just the
 *  score + confidence row rather than rendering noise. */
function parseReasoning(raw: string | null): {
  summary: string
  observed: string[]
  inferred: string[]
  unknown: string[]
} {
  if (!raw) return { summary: "", observed: [], inferred: [], unknown: [] }
  return {
    summary: extractInline(raw, "SUMMARY") ?? "",
    observed: extractList(raw, "OBSERVED"),
    inferred: extractList(raw, "INFERRED"),
    unknown: extractList(raw, "UNKNOWN"),
  }
}

const BLOCK_HEADERS = ["SUMMARY", "OBSERVED", "INFERRED", "UNKNOWN", "CONFIDENCE", "SCORE"] as const

function extractInline(text: string, header: string): string | null {
  const upper = header.toUpperCase()
  const startRe = new RegExp(`(^|\\n)${upper}:`, "")
  const startMatch = startRe.exec(text)
  if (!startMatch) return null
  const bodyStart = startMatch.index + startMatch[0].length
  let bodyEnd = text.length
  for (const other of BLOCK_HEADERS) {
    if (other === upper) continue
    const nextRe = new RegExp(`\\n${other}:`, "")
    const m = nextRe.exec(text.slice(bodyStart))
    if (m && bodyStart + m.index < bodyEnd) bodyEnd = bodyStart + m.index
  }
  const value = text.slice(bodyStart, bodyEnd).trim()
  return value.length > 0 ? value : null
}

function extractList(text: string, header: string): string[] {
  const body = extractInline(text, header)
  if (body === null) return []
  const items: string[] = []
  for (const line of body.split("\n").map((l) => l.trim()).filter(Boolean)) {
    if (line.startsWith("-")) {
      items.push(line.replace(/^-\s*/, "").trim())
    } else if (items.length > 0) {
      items[items.length - 1] = `${items[items.length - 1]} ${line}`
    }
  }
  const nonEmpty = items.filter((l) => l.length > 0)
  if (nonEmpty.length === 1 && /^\(?none\)?$/i.test(nonEmpty[0]!)) return []
  return nonEmpty
}
