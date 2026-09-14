"use client"

import { Globe, Cpu, Users, Building2, Mail } from "lucide-react"
import type { ElementType } from "react"
import { AreaChart, Area, ResponsiveContainer } from "recharts"

type NodeStatus = "running" | "idle" | "pending"

interface NetNode {
  id: string
  label: string
  sub?: string
  status: NodeStatus
  Icon: ElementType
}

const BORDER: Record<NodeStatus, string> = {
  running: "border-cyan-500/40 shadow-[0_0_12px_rgba(0,229,255,0.08)]",
  idle:    "border-border-subtle",
  pending: "border-warning-400/40",
}
const BG: Record<NodeStatus, string> = {
  running: "bg-cyan-500/[0.05]",
  idle:    "bg-bg-elevated",
  pending: "bg-warning-400/[0.05]",
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
const LABEL: Record<NodeStatus, string> = {
  running: "Running",
  idle:    "Ready",
  pending: "Pending",
}

const connectorPoints = [
  { v: 3 }, { v: 6 }, { v: 4 }, { v: 8 }, { v: 5 },
  { v: 9 }, { v: 7 }, { v: 10 }, { v: 8 }, { v: 12 },
]

function MiniAreaChart() {
  return (
    <ResponsiveContainer width={44} height={18}>
      <AreaChart data={connectorPoints} margin={{ top: 1, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="conn-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00E5FF" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#00E5FF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke="#00E5FF"
          strokeWidth={1.2}
          fill="url(#conn-grad)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

function Connector() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="flex items-center gap-1.5 rounded-md border border-border-subtle bg-bg-base px-2 py-0.5">
        <span className="font-mono text-[10px] text-text-disabled">Connectors</span>
        <span className="text-[10px] text-cyan-500/60">›</span>
      </div>
      <MiniAreaChart />
    </div>
  )
}

function NetCard({ node }: { node: NetNode }) {
  return (
    <div
      className={[
        "flex w-[148px] shrink-0 flex-col gap-2 rounded-xl border px-3 py-2.5 transition-shadow",
        BORDER[node.status],
        BG[node.status],
      ].join(" ")}
    >
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
          <node.Icon className="h-3.5 w-3.5 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 text-[12px] font-semibold leading-tight text-text-primary"
            title={node.label}
          >
            {node.label}
          </p>
          {node.sub && (
            <p className="mt-0.5 truncate text-[11px] text-text-disabled" title={node.sub}>
              {node.sub}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 border-t border-border-subtle/50 pt-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${DOT[node.status]}`} />
        <span className={`text-[11px] font-medium ${DOT_TEXT[node.status]}`}>
          {LABEL[node.status]}
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
  { id: "qual",  label: "Lead Qualification",  status: "running", Icon: Users    },
  { id: "crm",   label: "CRM",                 sub: "HubSpot Sync", status: "idle", Icon: Building2 },
  { id: "email", label: "Email Sequence",       status: "running", Icon: Mail     },
]

export function AutomationNetwork() {
  return (
    <div className="flex flex-col border-b border-border-subtle">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Active Automation Network
        </span>
        <button className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[11px] text-text-disabled transition-colors hover:border-border hover:text-text-muted">
          Interactive visual
        </button>
      </div>

      <div className="space-y-3 overflow-x-auto px-5 pb-5">
        {/* Row 1 */}
        <div className="flex items-center gap-2">
          {ROW1.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2">
              <NetCard node={node} />
              {i < ROW1.length - 1 && <Connector />}
            </div>
          ))}
        </div>

        {/* Vertical drop from col-2, row-1 down to col-2, row-2 */}
        <div className="ml-[172px] flex w-px items-center">
          <div className="h-4 w-px bg-gradient-to-b from-cyan-500/40 to-cyan-500/10" />
          <div className="ml-[-3px] mt-auto h-1.5 w-1.5 rotate-45 border-b border-r border-cyan-500/40" />
        </div>

        {/* Row 2 */}
        <div className="flex items-center gap-2">
          {ROW2.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2">
              <NetCard node={node} />
              {i < ROW2.length - 1 && <Connector />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
