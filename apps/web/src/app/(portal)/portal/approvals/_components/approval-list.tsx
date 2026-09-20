"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle } from "lucide-react"
import { Panel } from "@/components/portal/primitives"
import { PendingApprovalCard, DecidedApprovalCard } from "@/components/portal/approval-card"

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
              <PendingApprovalCard
                key={item.id}
                item={item}
                canDecide={canDecide}
                busy={busyId !== null}
                onApprove={() => decide(item.id, "approve")}
                onReject={() => decide(item.id, "reject")}
              />
            ))}
          </div>
        </Panel>
      )}

      {decided.length > 0 && (
        <Panel title="Already decided">
          <div className="divide-y divide-border-subtle/50">
            {decided.map((item) => (
              <DecidedApprovalCard key={item.id} item={item} />
            ))}
          </div>
        </Panel>
      )}
    </div>
  )
}
