"use client"

import { useEffect, useRef } from "react"

interface Node {
  id: string
  label: string
  x: number
  y: number
  status: "active" | "idle"
}

interface Edge {
  from: string
  to: string
  animated?: boolean
}

const nodes: Node[] = [
  { id: "form",    label: "Lead Form",    x: 50,  y: 40,  status: "active" },
  { id: "ai",      label: "AI Analysis",  x: 160, y: 40,  status: "active" },
  { id: "crm",     label: "CRM",          x: 260, y: 20,  status: "active" },
  { id: "email",   label: "Email Seq",    x: 260, y: 80,  status: "active" },
  { id: "website", label: "Website Gen",  x: 50,  y: 130, status: "idle"   },
  { id: "deploy",  label: "Deploy",       x: 160, y: 130, status: "idle"   },
  { id: "report",  label: "Reports",      x: 260, y: 130, status: "idle"   },
]

const edges: Edge[] = [
  { from: "form",    to: "ai",      animated: true },
  { from: "ai",      to: "crm",     animated: true },
  { from: "ai",      to: "email",   animated: true },
  { from: "website", to: "deploy",  animated: false },
  { from: "deploy",  to: "report",  animated: false },
]

function getNode(id: string) {
  return nodes.find((n) => n.id === id)!
}

export function AutomationNetwork() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<number>(0)
  const progressRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!

    const DPR = window.devicePixelRatio || 1
    const W = canvas.offsetWidth
    const H = canvas.offsetHeight
    canvas.width = W * DPR
    canvas.height = H * DPR
    ctx.scale(DPR, DPR)

    const scaleX = W / 320
    const scaleY = H / 180

    function draw(t: number) {
      ctx.clearRect(0, 0, W, H)
      progressRef.current = (t * 0.0004) % 1

      // Draw edges
      for (const edge of edges) {
        const a = getNode(edge.from)
        const b = getNode(edge.to)
        const ax = a.x * scaleX
        const ay = a.y * scaleY
        const bx = b.x * scaleX
        const by = b.y * scaleY

        ctx.beginPath()
        ctx.moveTo(ax, ay)
        ctx.lineTo(bx, by)
        ctx.strokeStyle = edge.animated ? "rgba(0,229,255,0.15)" : "rgba(38,51,66,0.8)"
        ctx.lineWidth = 1
        ctx.stroke()

        // Animated data pulse
        if (edge.animated) {
          const p = progressRef.current
          const px = ax + (bx - ax) * p
          const py = ay + (by - ay) * p

          const gradient = ctx.createRadialGradient(px, py, 0, px, py, 4)
          gradient.addColorStop(0, "rgba(0,229,255,0.9)")
          gradient.addColorStop(1, "rgba(0,229,255,0)")

          ctx.beginPath()
          ctx.arc(px, py, 4, 0, Math.PI * 2)
          ctx.fillStyle = gradient
          ctx.fill()
        }
      }

      // Draw nodes
      for (const node of nodes) {
        const nx = node.x * scaleX
        const ny = node.y * scaleY
        const isActive = node.status === "active"

        // Glow
        if (isActive) {
          const glow = ctx.createRadialGradient(nx, ny, 0, nx, ny, 16)
          glow.addColorStop(0, "rgba(0,229,255,0.12)")
          glow.addColorStop(1, "rgba(0,229,255,0)")
          ctx.beginPath()
          ctx.arc(nx, ny, 16, 0, Math.PI * 2)
          ctx.fillStyle = glow
          ctx.fill()
        }

        // Circle
        ctx.beginPath()
        ctx.arc(nx, ny, 5, 0, Math.PI * 2)
        ctx.fillStyle = isActive ? "#00E5FF" : "#263342"
        ctx.fill()
        ctx.strokeStyle = isActive ? "rgba(0,229,255,0.4)" : "#1E2935"
        ctx.lineWidth = 1
        ctx.stroke()

        // Label
        ctx.font = "9px Inter, system-ui"
        ctx.fillStyle = isActive ? "#8B98A8" : "#586474"
        ctx.textAlign = "center"
        ctx.fillText(node.label, nx, ny + 16)
      }

      frameRef.current = requestAnimationFrame(draw)
    }

    frameRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ display: "block" }}
      />
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between text-xs text-text-disabled font-mono">
        <span>7 nodes active</span>
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
          live
        </span>
      </div>
    </div>
  )
}
