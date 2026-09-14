"use client"

import { Globe, Cpu, Users, Building2, Mail } from "lucide-react"
import type { ElementType } from "react"

type NodeStatus = "running" | "idle" | "pending"

interface NetNode {
  id: string
  label: string
  sub?: string
  status: NodeStatus
  Icon: ElementType
}

const STATUS_DOT: Record<NodeStatus, string> = {
  running: "bg-cyan-400 animate-pulse",
  idle:    "bg-border-strong",
  pending: "bg-warning-400/70",
}
const STATUS_LABEL: Record<NodeStatus, string> = {
  running: "Running",
  idle:    "Status",
  pending: "Pending",
}
const STATUS_TEXT: Record<NodeStatus, string> = {
  running: "text-cyan-400",
  idle:    "text-text-disabled",
  pending: "text-warning-400",
}
const BORDER: Record<NodeStatus, string> = {
  running: "border-cyan-500/30 bg-cyan-500/[0.04]",
  idle:    "border-border-subtle bg-bg-elevated",
  pending: "border-warning-400/30 bg-warning-400/[0.04]",
}

function MiniSpark() {
  const pts = [0, 4, 2, 8, 5, 3, 8, 10, 11, 6, 14, 9]
    .map((v, i) => (i % 2 === 0 ? `${(v / 14) * 32}` : `${12 - (v / 10) * 10}`))
    .reduce<string[]>((acc, v, i) => {
      if (i % 2 === 0) acc.push(v)
      else acc[acc.length - 1] += `,${v}`
      return acc
    }, [])
    .join(" ")
  return (
    <svg width="32" height="12" viewBox="0 0 32 12">
      <polyline
        points={pts}
        fill="none"
        stroke="rgba(0,229,255,0.5)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

function Connector() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-0.5">
      <div className="flex items-center gap-1 rounded border border-border-subtle bg-bg-base px-2 py-1">
        <span className="text-[10px] text-text-disabled">Connectors</span>
        <span className="text-text-disabled">›</span>
      </div>
      <MiniSpark />
    </div>
  )
}

function NetCard({ node }: { node: NetNode }) {
  return (
    <div className={`flex w-36 shrink-0 flex-col gap-1 rounded-lg border px-3 py-2.5 ${BORDER[node.status]}`}>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 rounded border border-border-subtle bg-bg-surface p-1">
          <node.Icon className="h-3 w-3 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold leading-snug text-text-primary">
            {node.label}
          </p>
          {node.sub && (
            <p className="text-[11px] text-text-disabled">{node.sub}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5 pt-0.5">
        <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[node.status]}`} />
        <span className={`text-[11px] font-medium ${STATUS_TEXT[node.status]}`}>
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  )
}

const ROW1: NetNode[] = [
  { id: "trigger", label: "Website Lead Trigger", status: "running", Icon: Globe },
  { id: "ai",      label: "AI Analysis", sub: "Agent Ava.", status: "running", Icon: Cpu },
]

const ROW2: NetNode[] = [
  { id: "qual",  label: "Lead Qualification", status: "running", Icon: Users },
  { id: "crm",   label: "CRM", sub: "(HubSpot Sync)", status: "idle", Icon: Building2 },
  { id: "email", label: "Email Sequence", status: "running", Icon: Mail },
]

export function AutomationNetwork() {
  return (
    <div className="flex flex-col border-b border-border-subtle">
      <div className="flex shrink-0 items-center justify-between px-5 py-3">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Active Automation Network
        </span>
        <button className="rounded border border-border-subtle bg-bg-elevated px-2 py-1 text-[11px] text-text-disabled hover:border-border hover:text-text-muted transition-colors">
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

        {/* Vertical connector (centered under col 2) */}
        <div className="ml-[176px] flex items-center">
          <div className="flex h-5 w-[2px] flex-col items-center bg-border-subtle">
            <div className="mt-auto h-1.5 w-1.5 translate-y-0.5 rotate-45 border-b border-r border-border-subtle bg-bg-base" />
          </div>
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
