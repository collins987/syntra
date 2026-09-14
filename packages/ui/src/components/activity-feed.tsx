import * as React from "react"
import { cn } from "../lib/utils"
import { Badge } from "./badge"

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

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn("space-y-1", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-bg-overlay transition-colors duration-[120ms]"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                item.status === "running" && "bg-cyan-400 animate-pulse",
                item.status === "completed" && "bg-success-400",
                item.status === "scheduled" && "bg-text-muted",
                item.status === "failed" && "bg-error-400",
                item.status === "paused" && "bg-warning-400"
              )}
            />
            <span className="text-sm text-text-primary truncate">{item.label}</span>
            {item.detail && (
              <span className="text-xs text-text-muted hidden sm:block truncate">{item.detail}</span>
            )}
          </div>
          <div className="flex items-center gap-3 ml-3 shrink-0">
            {item.time && <span className="text-xs font-mono text-text-muted">{item.time}</span>}
            <Badge variant={item.status}>{item.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  )
}
