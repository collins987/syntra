import { Check, X, Loader2, Clock } from "lucide-react"
import { StatusBadge, timeAgo, type StatusTone } from "./primitives"

export interface ApprovalCardItem {
  id: string
  agentName: string
  capability: string
  summary: string
  status: string
  createdAt: string
  expiresAt: string
  executionFailed: boolean
  executionError: string | null
}

const DECIDED_STATUS_TONE: Record<string, StatusTone> = {
  pending: "warning",
  approved: "success",
  rejected: "neutral",
  expired: "neutral",
}

/** An item still waiting on a decision — the only variant with actions. */
export function PendingApprovalCard({
  item,
  canDecide,
  busy,
  onApprove,
  onReject,
}: {
  item: ApprovalCardItem
  canDecide: boolean
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="flex flex-wrap items-start gap-4 px-6 py-5">
      <div className="min-w-0 flex-1">
        <div className="mb-1.5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-cyan-400">{item.agentName}</span>
          <span className="font-mono text-[11px] text-text-disabled">{item.capability}</span>
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
            onClick={onApprove}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Approve
          </button>
          <button
            onClick={onReject}
            disabled={busy}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-border-subtle bg-bg-surface px-4 text-sm text-text-muted transition-colors hover:border-border hover:text-text-primary disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
        </div>
      ) : (
        <p className="shrink-0 self-center text-xs text-text-disabled">Needs an admin to approve</p>
      )}
    </div>
  )
}

/** An item that already has a decision — read-only, no actions. */
export function DecidedApprovalCard({ item }: { item: ApprovalCardItem }) {
  return (
    <div className="flex items-center gap-4 px-6 py-3.5">
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
        <StatusBadge tone="error">approved · failed</StatusBadge>
      ) : (
        <StatusBadge tone={DECIDED_STATUS_TONE[item.status] ?? "neutral"}>{item.status}</StatusBadge>
      )}
    </div>
  )
}
