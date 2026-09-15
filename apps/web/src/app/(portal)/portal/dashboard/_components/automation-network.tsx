import Link from "next/link"
import { Globe, Cpu, Users, Building2, Mail, Network, Zap } from "lucide-react"
import type { ElementType } from "react"
import type { Automation } from "@syntra/db"

type NodeStatus = "running" | "idle" | "pending" | "error"

interface NetNode {
  id: string
  label: string
  techData: string
  status: NodeStatus
  Icon: ElementType
}

const NODE_W = "w-[118px]"

const BORDER: Record<NodeStatus, string> = {
  running: "border-cyan-500/35 shadow-[0_0_12px_rgba(0,229,255,0.09)]",
  idle:    "border-border-subtle",
  pending: "border-warning-400/35",
  error:   "border-error-500/35",
}
const BG: Record<NodeStatus, string> = {
  running: "bg-cyan-500/[0.05]",
  idle:    "bg-bg-elevated",
  pending: "bg-warning-400/[0.04]",
  error:   "bg-error-500/[0.04]",
}
const DOT: Record<NodeStatus, string> = {
  running: "bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(0,229,255,0.7)]",
  idle:    "bg-border-strong",
  pending: "bg-warning-400",
  error:   "bg-error-400",
}
const STATUS_TEXT: Record<NodeStatus, string> = {
  running: "text-cyan-400",
  idle:    "text-text-disabled",
  pending: "text-warning-400",
  error:   "text-error-400",
}
const STATUS_LABEL: Record<NodeStatus, string> = {
  running: "Running",
  idle:    "Paused",
  pending: "Draft",
  error:   "Error",
}

const ICON_CYCLE: ElementType[] = [Globe, Cpu, Users, Building2, Mail]

function toNodeStatus(status: Automation["status"]): NodeStatus {
  if (status === "active") return "running"
  if (status === "error") return "error"
  if (status === "draft") return "pending"
  return "idle"
}

function timeAgo(iso: string | null) {
  if (!iso) return "never run"
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function Connector({ active = true }: { active?: boolean }) {
  return (
    <div className="flex w-[46px] shrink-0 flex-col items-center gap-0.5">
      <span className="text-[9px] font-medium tracking-wide text-text-disabled">Connectors</span>
      <svg width="46" height="22" viewBox="0 0 46 22" xmlns="http://www.w3.org/2000/svg">
        <polyline
          points="2,10 7,7 12,9 17,5 22,7 27,4 32,6 37,3 42,5"
          fill="none"
          stroke={active ? "rgba(0,229,255,0.45)" : "#263342"}
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <line
          x1="2" y1="16" x2="39" y2="16"
          stroke={active ? "rgba(0,229,255,0.25)" : "#1E2935"}
          strokeWidth="1.5"
          strokeDasharray={active ? "4 2" : "none"}
        />
        <polygon points="39,13 45,16 39,19" fill={active ? "rgba(0,229,255,0.5)" : "#263342"} />
        {active && (
          <circle r="2.5" fill="#00E5FF">
            <animateMotion path="M2,16 L39,16" dur="1.6s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.2;1;0.2" dur="1.6s" repeatCount="indefinite" />
          </circle>
        )}
      </svg>
    </div>
  )
}

function NetCard({ node }: { node: NetNode }) {
  return (
    <div
      className={[NODE_W, "shrink-0 rounded-xl border px-2.5 py-2.5", BORDER[node.status], BG[node.status]].join(" ")}
    >
      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
          <node.Icon className="h-3 w-3 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-primary" title={node.label}>
            {node.label}
          </p>
          <p className="mt-0.5 truncate font-mono text-[9px] text-text-disabled" title={node.techData}>
            {node.techData}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-1.5 border-t border-border-subtle/40 pt-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[node.status]}`} />
        <span className={`text-[10px] font-semibold ${STATUS_TEXT[node.status]}`}>
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  )
}

export function AutomationNetwork({ automations }: { automations: Automation[] }) {
  const nodes: NetNode[] = automations.slice(0, 5).map((a, i) => ({
    id: a.id,
    label: a.name,
    techData: `${a.workflow_code} · ${timeAgo(a.last_run_at)}`,
    status: toNodeStatus(a.status),
    Icon: ICON_CYCLE[i % ICON_CYCLE.length]!,
  }))

  const row1 = nodes.slice(0, 2)
  const row2 = nodes.slice(2, 5)

  return (
    <div className="flex flex-col border-b border-border-subtle">
      <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Active Automation Network
        </span>
        <Link
          href="/portal/automations"
          className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted"
        >
          View all
        </Link>
      </div>

      {nodes.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-5 pb-8 pt-4 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
            <Network className="h-5 w-5 text-text-disabled" />
          </div>
          <p className="text-sm font-semibold text-text-primary">No automations connected</p>
          <p className="mt-1 max-w-[280px] text-xs text-text-muted">
            Your automation network builds itself as workflows come online.
          </p>
          <Link
            href="/portal/automations"
            className="mt-4 flex h-8 items-center gap-1.5 rounded-lg bg-cyan-500 px-4 text-xs font-semibold text-bg-base shadow-glow-sm transition-colors hover:bg-cyan-400"
          >
            <Zap className="h-3 w-3" />
            Create your first automation
          </Link>
        </div>
      ) : (
        <div className="space-y-2 px-5 pb-5">
          <div className="flex items-center gap-1">
            {row1.map((node, i) => (
              <div key={node.id} className="flex items-center gap-1">
                <NetCard node={node} />
                {i < row1.length - 1 && <Connector active={node.status === "running"} />}
              </div>
            ))}
          </div>

          {row2.length > 0 && (
            <>
              <div className="relative ml-[163px] flex h-5 items-center">
                <svg width="12" height="20" viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
                  <line x1="6" y1="0" x2="6" y2="16" stroke="rgba(0,229,255,0.25)" strokeWidth="1.5" strokeDasharray="3 2" />
                  <polygon points="2,14 6,20 10,14" fill="rgba(0,229,255,0.45)" />
                  <circle r="2" fill="#00E5FF" cx="6" cy="0">
                    <animate attributeName="cy" from="0" to="14" dur="1.4s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite" />
                  </circle>
                </svg>
              </div>

              <div className="flex items-center gap-1">
                {row2.map((node, i) => (
                  <div key={node.id} className="flex items-center gap-1">
                    <NetCard node={node} />
                    {i < row2.length - 1 && <Connector active={node.status === "running"} />}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
