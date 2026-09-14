"use client"

const NW = 88
const NH = 28
const RX = 3

interface NodeDef {
  id: string
  label: string
  sub: string
  cx: number
  cy: number
  status: "active" | "idle" | "pending"
}

const NODES: NodeDef[] = [
  { id: "form",    label: "Lead Form",    sub: "WF-002",      cx: 56,  cy: 48,  status: "active"  },
  { id: "ai",      label: "AI Analysis",  sub: "Claude",      cx: 170, cy: 48,  status: "active"  },
  { id: "crm",     label: "CRM Update",   sub: "HubSpot",     cx: 284, cy: 22,  status: "active"  },
  { id: "email",   label: "Email Seq",    sub: "3 contacts",  cx: 284, cy: 74,  status: "active"  },
  { id: "website", label: "Website Gen",  sub: "Next.js",     cx: 56,  cy: 158, status: "idle"    },
  { id: "deploy",  label: "Deploy",       sub: "Cloudflare",  cx: 170, cy: 158, status: "idle"    },
  { id: "report",  label: "Analytics",   sub: "Scheduled",   cx: 284, cy: 158, status: "pending" },
]

const EDGES: Array<{ from: string; to: string; active: boolean }> = [
  { from: "form",    to: "ai",      active: true  },
  { from: "ai",      to: "crm",     active: true  },
  { from: "ai",      to: "email",   active: true  },
  { from: "website", to: "deploy",  active: false },
  { from: "deploy",  to: "report",  active: false },
]

const nodeMap = Object.fromEntries(NODES.map((n) => [n.id, n]))

function edgePath(fromId: string, toId: string) {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const a = nodeMap[fromId]!
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const b = nodeMap[toId]!
  const ax = a.cx + NW / 2
  const ay = a.cy
  const bx = b.cx - NW / 2
  const by = b.cy
  const mx = (ax + bx) / 2
  return `M ${ax} ${ay} C ${mx} ${ay} ${mx} ${by} ${bx} ${by}`
}

const STYLE = {
  active:  { stroke: "#00E5FF", fill: "rgba(0,229,255,0.05)", text: "#E6EDF3", sub: "#8B98A8", dot: "#00E5FF" },
  idle:    { stroke: "#263342", fill: "transparent",           text: "#586474", sub: "#3D4F5E", dot: ""        },
  pending: { stroke: "#F59E0B", fill: "rgba(245,158,11,0.05)", text: "#8B98A8", sub: "#586474", dot: "#F59E0B" },
}

export function AutomationNetwork() {
  return (
    <div className="flex h-full w-full flex-col gap-2">
      <svg
        viewBox="0 0 340 192"
        className="w-full flex-1"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
      >
        <defs>
          <marker id="syn-arrow-active" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0.5 L4.5,2.5 L0,4.5 Z" fill="rgba(0,229,255,0.6)" />
          </marker>
          <marker id="syn-arrow-idle" markerWidth="5" markerHeight="5" refX="4.5" refY="2.5" orient="auto">
            <path d="M0,0.5 L4.5,2.5 L0,4.5 Z" fill="#263342" />
          </marker>
        </defs>

        {/* Pipeline A label */}
        <text
          x="4" y="11"
          fontSize="6.5"
          fill="#3D4F5E"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.08em"
        >
          PIPELINE A · LEAD QUALIFICATION
        </text>

        {/* Divider */}
        <line
          x1="0" y1="112" x2="340" y2="112"
          stroke="#1A2535" strokeWidth="1" strokeDasharray="3 6"
        />

        {/* Pipeline B label */}
        <text
          x="4" y="126"
          fontSize="6.5"
          fill="#3D4F5E"
          fontFamily="'JetBrains Mono', monospace"
          letterSpacing="0.08em"
        >
          PIPELINE B · WEBSITE GENERATION
        </text>

        {/* Edges */}
        {EDGES.map(({ from, to, active }) => (
          <path
            key={`${from}-${to}`}
            d={edgePath(from, to)}
            fill="none"
            stroke={active ? "rgba(0,229,255,0.4)" : "#1E2935"}
            strokeWidth={active ? 1.5 : 1}
            strokeDasharray={active ? "6 4" : undefined}
            markerEnd={active ? "url(#syn-arrow-active)" : "url(#syn-arrow-idle)"}
          >
            {active && (
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="-20"
                dur="1.2s"
                repeatCount="indefinite"
              />
            )}
          </path>
        ))}

        {/* Nodes */}
        {NODES.map((node) => {
          const s = STYLE[node.status]
          const x = node.cx - NW / 2
          const y = node.cy - NH / 2
          return (
            <g key={node.id}>
              <rect
                x={x} y={y} width={NW} height={NH} rx={RX} ry={RX}
                fill={s.fill} stroke={s.stroke} strokeWidth="1"
              />
              {/* Label */}
              <text
                x={node.cx} y={node.cy - 2}
                textAnchor="middle"
                fontSize="8.5"
                fontWeight="600"
                fill={s.text}
                fontFamily="Inter, system-ui"
              >
                {node.label}
              </text>
              {/* Sub-label */}
              <text
                x={node.cx} y={node.cy + 9}
                textAnchor="middle"
                fontSize="7"
                fill={s.sub}
                fontFamily="'JetBrains Mono', monospace"
              >
                {node.sub}
              </text>
              {/* Status pulse dot */}
              {s.dot && (
                <circle cx={x + NW - 6} cy={y + 6} r="2.5" fill={s.dot}>
                  {node.status === "active" && (
                    <animate
                      attributeName="opacity"
                      values="0.25;1;0.25"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  )}
                </circle>
              )}
            </g>
          )
        })}
      </svg>

      {/* Footer */}
      <div className="flex items-center justify-between font-mono text-[10px] text-text-disabled">
        <span>
          <span className="text-cyan-400">4</span> active
          {" · "}
          <span>2</span> idle
          {" · "}
          <span className="text-warning-400">1</span> pending
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-500" />
          live
        </span>
      </div>
    </div>
  )
}
