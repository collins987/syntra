"use client"

import { Globe, Cpu, Users, Building2, Mail } from "lucide-react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"
import type { ElementType } from "react"

type NodeStatus = "running" | "idle" | "pending"

interface NetNode {
  id: string
  label: string
  sub?: string
  status: NodeStatus
  Icon: ElementType
}

// ── Right panel inner = 460px − 2×20px padding = 420px
// Row 2: 3 nodes × 108px + 2 connectors × 38px + 4 gaps × 4px = 324+76+16 = 416px ✓
const NODE_W = "w-[108px]"
const CONN_W = "w-[38px]"

const BORDER: Record<NodeStatus, string> = {
  running: "border-cyan-500/35 shadow-[0_0_10px_rgba(0,229,255,0.07)]",
  idle:    "border-border-subtle",
  pending: "border-warning-400/35",
}
const BG: Record<NodeStatus, string> = {
  running: "bg-cyan-500/[0.05]",
  idle:    "bg-bg-elevated",
  pending: "bg-warning-400/[0.04]",
}
const DOT: Record<NodeStatus, string> = {
  running: "bg-cyan-400 animate-pulse",
  idle:    "bg-border-strong",
  pending: "bg-warning-400",
}
const DOT_TEXT: Record<NodeStatus, string> = {
  running: "text-cyan-400",
  idle:    "text-text-disabled",
  pending: "text-warning-400",
}
const STATUS_LABEL: Record<NodeStatus, string> = {
  running: "Running",
  idle:    "Ready",
  pending: "Pending",
}

const connData = [{ v: 3 }, { v: 6 }, { v: 4 }, { v: 8 }, { v: 5 }, { v: 9 }, { v: 7 }]

let connId = 0
function Connector() {
  const id = `cg-${connId++}`
  return (
    <div className={`${CONN_W} shrink-0 flex flex-col items-center gap-0.5`}>
      <div className="flex items-center gap-0.5 rounded border border-border-subtle bg-bg-base px-1 py-0.5">
        <span className="font-mono text-[9px] leading-none text-text-disabled">Conn.</span>
        <span className="text-[9px] text-cyan-500/50">›</span>
      </div>
      <ResponsiveContainer width="100%" height={14}>
        <AreaChart data={connData} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke="#00E5FF" strokeWidth={1} fill={`url(#${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function NetCard({ node }: { node: NetNode }) {
  return (
    <div className={`${NODE_W} shrink-0 rounded-xl border px-2.5 py-2.5 ${BORDER[node.status]} ${BG[node.status]}`}>
      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
          <node.Icon className="h-3 w-3 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-primary" title={node.label}>
            {node.label}
          </p>
          {node.sub && (
            <p className="mt-0.5 truncate text-[10px] text-text-disabled" title={node.sub}>
              {node.sub}
            </p>
          )}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1 border-t border-border-subtle/40 pt-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[node.status]}`} />
        <span className={`text-[10px] font-medium ${DOT_TEXT[node.status]}`}>
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  )
}

const ROW1: NetNode[] = [
  { id: "trigger", label: "Website Lead Trigger", status: "running", Icon: Globe },
  { id: "ai",      label: "AI Analysis",          sub: "Agent Ava.", status: "running", Icon: Cpu },
]

const ROW2: NetNode[] = [
  { id: "qual",  label: "Lead Qualification", status: "running", Icon: Users    },
  { id: "crm",   label: "CRM",                sub: "HubSpot Sync", status: "idle", Icon: Building2 },
  { id: "email", label: "Email Sequence",      status: "running", Icon: Mail     },
]

export function AutomationNetwork() {
  return (
    <div className="flex flex-col border-b border-border-subtle">
      <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Active Automation Network
        </span>
        <button className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted">
          Interactive visual
        </button>
      </div>

      <div className="space-y-2 px-5 pb-5">
        {/* Row 1 */}
        <div className="flex items-center gap-1">
          {ROW1.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <NetCard node={node} />
              {i < ROW1.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Vertical connector from right of col-1 down to row-2 col-2 */}
        <div className="ml-[54px] h-4 w-px bg-gradient-to-b from-cyan-500/30 to-transparent" />

        {/* Row 2 */}
        <div className="flex items-center gap-1">
          {ROW2.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <NetCard node={node} />
              {i < ROW2.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
