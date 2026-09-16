"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, X, Loader2, AlertCircle, Clock } from "lucide-react"
import { Badge, Panel, timeAgo, type BadgeTone } from "@/components/portal/primitives"

export interface ApprovalItem {
  id: string
  agentKey: string
  agentName: string
  capability: string
  summary: string
  status: string
  createdAt: string
  expiresAt: string
  /** Approved, but the action itself did not complete. */
  executionFailed: boolean
  executionError: string | null
}

const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warn",
  approved: "good",
  rejected: "neutral",
  expired: "neutral",
}

export function ApprovalList({
  pending,
  decided,
  canDecide,
}: {
  pending: ApprovalItem[]
  decided: ApprovalItem[]
  /** Only a client admin may decide; members see the queue read-only. */
  canDecide: boolean
}) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function decide(id: string, decision: "approve" | "reject") {
    setBusyId(id)
    setError(null)
    try {
      const res = await fetch("/api/ai/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvalId: id, decision }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not save your decision")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
          <p className="text-sm text-error-400">{error}</p>
        </div>
      )}

      {pending.length > 0 && (
        <Panel
          title={canDecide ? "Waiting for you" : "Waiting for an admin"}
          description={
            canDecide
              ? "Nothing here has happened yet. It runs only if you approve it."
              : "Nothing here has happened yet. It runs only if an admin in your organisation approves it."
          }
        >
          <div className="divide-y divide-border-subtle/50">
            {pending.map((item) => (
              <div key={item.id} className="flex flex-wrap items-start gap-4 px-6 py-5">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-cyan-400">{item.agentName}</span>
                    <span className="font-mono text-[11px] text-text-disabled">
                      {item.capability}
                    </span>
                  </div>
                  <p className="text-sm text-text-primary">{item.summary}</p>
                  <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-text-disabled">
                    <Clock className="h-3 w-3" />
                    Proposed {timeAgo(item.createdAt)} · expires {timeAgo(item.expiresAt)}
                  </p>
                </div>

                {canDecide ? (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => decide(item.id, "approve")}
                      disabled={busyId !== null}
                      className="flex h-9 items-center gap-1.5 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm transition-colors hover:bg-cyan-400 disabled:opacity-50"
                    >
                      {busyId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Approve
                    </button>
                    <button
                      onClick={() => decide(item.id, "reject")}
                      disabled={busyId !== null}
                      className="flex h-9 items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm text-text-muted transition-colors hover:border-border hover:text-text-primary disabled:opacity-50"
                    >
                      <X className="h-3.5 w-3.5" />
                      Reject
                    </button>
                  </div>
                ) : (
                  <p className="shrink-0 self-center text-xs text-text-disabled">
                    Needs an admin to approve
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}

      {decided.length > 0 && (
        <Panel title="Already decided">
          <div className="divide-y divide-border-subtle/50">
            {decided.map((item) => (
              <div key={item.id} className="flex items-center gap-4 px-6 py-3.5">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-muted">{item.summary}</p>
                  <p className="mt-0.5 text-[11px] text-text-disabled">
                    {item.agentName} · {timeAgo(item.createdAt)}
                  </p>
                  {item.executionFailed && item.executionError && (
                    <p className="mt-1 text-[11px] text-error-400">{item.executionError}</p>
                  )}
                </div>
                {item.executionFailed ? (
                  <Badge tone="bad">approved · failed</Badge>
                ) : (
                  <Badge tone={STATUS_TONE[item.status] ?? "neutral"}>{item.status}</Badge>
                )}
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
