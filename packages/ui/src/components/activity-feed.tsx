import * as React from "react"
import { cn } from "../lib/utils"

type ActivityStatus = "running" | "completed" | "scheduled" | "failed" | "paused"

export interface ActivityItem {
  id: string
  label: string
  status: ActivityStatus
  detail?: string
  time?: string
}

interface ActivityFeedProps {
  items: ActivityItem[]
  className?: string
}

const statusColor: Record<ActivityStatus, string> = {
  running: "text-cyan-400",
  completed: "text-success-400",
  failed: "text-error-400",
  scheduled: "text-text-disabled",
  paused: "text-warning-400",
}

const statusPrefix: Record<ActivityStatus, string> = {
  running: "●",
  completed: "✓",
  failed: "✗",
  scheduled: "○",
  paused: "‖",
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn("font-mono text-[12px]", className)}>
      {items.map((item, i) => (
        <div
          key={item.id}
          className={cn(
            "flex items-center gap-3 py-1.5 pl-3 pr-4 transition-colors hover:bg-bg-overlay/50",
            item.status === "failed" && "bg-error-500/5 hover:bg-error-500/10",
          )}
        >
          {/* Line number */}
          <span className="w-4 shrink-0 select-none text-right text-text-disabled">
            {i + 1}
          </span>

          {/* Status prefix */}
          <span
            className={cn(
              "shrink-0 text-[11px] tabular-nums",
              statusColor[item.status],
              item.status === "running" && "animate-pulse",
            )}
          >
            {statusPrefix[item.status]}
          </span>

          {/* Label */}
          <span
            className={cn(
              "flex-1 truncate",
              item.status === "running" && "text-text-primary",
              item.status === "completed" && "text-text-secondary",
              item.status === "failed" && "text-error-300",
              (item.status === "scheduled" || item.status === "paused") && "text-text-muted",
            )}
          >
            {item.label}
          </span>

          {/* Detail */}
          {item.detail && (
            <span className="hidden shrink-0 text-text-disabled sm:inline">
              {item.detail}
            </span>
          )}

          {/* Time */}
          {item.time && (
            <span className="shrink-0 text-text-disabled">{item.time}</span>
          )}
        </div>
      ))}
    </div>
  )
}
