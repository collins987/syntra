"use client"

import { Globe, Cpu, Users, Building2, Mail } from "lucide-react"
import type { ElementType } from "react"

type NodeStatus = "running" | "idle" | "pending"

interface NetNode {
  id: string
  label: string
  techData: string   // monospace technical data displayed under label
  status: NodeStatus
  Icon: ElementType
}

// ── Sizing: right panel 48% of ~1056px = ~507px, minus 40px padding = 467px
// Row-2 budget: 3×118 + 2×46 + 4px gaps = 354+92+12 = 458px ✓
const NODE_W = "w-[118px]"

const BORDER: Record<NodeStatus, string> = {
  running: "border-cyan-500/35 shadow-[0_0_12px_rgba(0,229,255,0.09)]",
  idle:    "border-border-subtle",
  pending: "border-warning-400/35",
}
const BG: Record<NodeStatus, string> = {
  running: "bg-cyan-500/[0.05]",
  idle:    "bg-bg-elevated",
  pending: "bg-warning-400/[0.04]",
}
const DOT: Record<NodeStatus, string> = {
  running: "bg-cyan-400 animate-pulse shadow-[0_0_5px_rgba(0,229,255,0.7)]",
  idle:    "bg-border-strong",
  pending: "bg-warning-400",
}
const STATUS_TEXT: Record<NodeStatus, string> = {
  running: "text-cyan-400",
  idle:    "text-text-disabled",
  pending: "text-warning-400",
}
const STATUS_LABEL: Record<NodeStatus, string> = {
  running: "Running",
  idle:    "Status",
  pending: "Pending",
}

/* Connector — dark line + pulsing dot moving along it + mini sparkline + arrow */
function Connector({ active = true }: { active?: boolean }) {
  return (
    <div className="flex w-[46px] shrink-0 flex-col items-center gap-0.5">
      <span className="text-[9px] font-medium tracking-wide text-text-disabled">
        Connectors
      </span>
      <svg width="46" height="22" viewBox="0 0 46 22" xmlns="http://www.w3.org/2000/svg">
        {/* Mini sparkline above the main line */}
        <polyline
          points="2,10 7,7 12,9 17,5 22,7 27,4 32,6 37,3 42,5"
          fill="none"
          stroke={active ? "rgba(0,229,255,0.45)" : "#263342"}
          strokeWidth="1.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* Main connector line */}
        <line
          x1="2" y1="16" x2="39" y2="16"
          stroke={active ? "rgba(0,229,255,0.25)" : "#1E2935"}
          strokeWidth="1.5"
          strokeDasharray={active ? "4 2" : "none"}
        />
        {/* Arrow head */}
        <polygon
          points="39,13 45,16 39,19"
          fill={active ? "rgba(0,229,255,0.5)" : "#263342"}
        />
        {/* Pulsing data point moving along the line */}
        {active && (
          <circle r="2.5" fill="#00E5FF">
            <animateMotion
              path="M2,16 L39,16"
              dur="1.6s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0.2;1;0.2"
              dur="1.6s"
              repeatCount="indefinite"
            />
          </circle>
        )}
      </svg>
    </div>
  )
}

function NetCard({ node }: { node: NetNode }) {
  return (
    <div
      className={[
        NODE_W,
        "shrink-0 rounded-xl border px-2.5 py-2.5",
        BORDER[node.status],
        BG[node.status],
      ].join(" ")}
    >
      {/* Icon + label */}
      <div className="flex items-start gap-1.5">
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
          <node.Icon className="h-3 w-3 text-text-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 text-[11px] font-semibold leading-tight text-text-primary"
            title={node.label}
          >
            {node.label}
          </p>
          {/* Technical data in monospace — per spec */}
          <p
            className="mt-0.5 truncate font-mono text-[9px] text-text-disabled"
            title={node.techData}
          >
            {node.techData}
          </p>
        </div>
      </div>

      {/* Status row */}
      <div className="mt-2 flex items-center gap-1.5 border-t border-border-subtle/40 pt-1.5">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[node.status]}`} />
        <span className={`text-[10px] font-semibold ${STATUS_TEXT[node.status]}`}>
          {STATUS_LABEL[node.status]}
        </span>
      </div>
    </div>
  )
}

// ── Node data ─────────────────────────────────────────────────────────────────

const ROW1: NetNode[] = [
  {
    id: "trigger",
    label: "Website Lead Trigger",
    techData: "wf:001 · 3.2k/hr",
    status: "running",
    Icon: Globe,
  },
  {
    id: "ai",
    label: "AI Analysis",
    techData: "agt:ava · claude-3.5",
    status: "running",
    Icon: Cpu,
  },
]

const ROW2: NetNode[] = [
  {
    id: "qual",
    label: "Lead Qualification",
    techData: "wf:003 · scr:A+",
    status: "running",
    Icon: Users,
  },
  {
    id: "crm",
    label: "CRM",
    techData: "hubspot · 94ms sync",
    status: "idle",
    Icon: Building2,
  },
  {
    id: "email",
    label: "Email Sequence",
    techData: "seq:003 · 3 leads",
    status: "running",
    Icon: Mail,
  },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function AutomationNetwork() {
  return (
    <div className="flex flex-col border-b border-border-subtle">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-5 py-3.5">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Active Automation Network
        </span>
        <button className="rounded-md border border-border-subtle bg-bg-elevated px-2.5 py-1 text-[10px] text-text-disabled transition-colors hover:border-border hover:text-text-muted">
          Interactive visual
        </button>
      </div>

      <div className="space-y-2 px-5 pb-5">
        {/* Row 1 — Lead Trigger → AI Analysis */}
        <div className="flex items-center gap-1">
          {ROW1.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <NetCard node={node} />
              {i < ROW1.length - 1 && <Connector active />}
            </div>
          ))}
        </div>

        {/* Vertical connector: AI Analysis (right side of row 1) drops to CRM (row 2) */}
        <div className="relative ml-[163px] flex h-5 items-center">
          <svg width="12" height="20" viewBox="0 0 12 20" xmlns="http://www.w3.org/2000/svg">
            <line x1="6" y1="0" x2="6" y2="16"
              stroke="rgba(0,229,255,0.25)" strokeWidth="1.5" strokeDasharray="3 2" />
            <polygon points="2,14 6,20 10,14" fill="rgba(0,229,255,0.45)" />
            <circle r="2" fill="#00E5FF" cx="6" cy="0">
              <animate attributeName="cy" from="0" to="14" dur="1.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.2;1;0.2" dur="1.4s" repeatCount="indefinite" />
            </circle>
          </svg>
        </div>

        {/* Row 2 — Lead Qual → CRM → Email */}
        <div className="flex items-center gap-1">
          {ROW2.map((node, i) => (
            <div key={node.id} className="flex items-center gap-1">
              <NetCard node={node} />
              {i < ROW2.length - 1 && <Connector active={node.status === "running"} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
