import * as React from "react"
import { cn } from "../lib/utils"

type BadgeVariant = "running" | "completed" | "scheduled" | "failed" | "paused" | "draft" | "default"

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  dot?: boolean
}

const variantStyles: Record<BadgeVariant, string> = {
  running: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  completed: "bg-success-500/10 text-success-400 border-success-500/20",
  scheduled: "bg-bg-elevated text-text-muted border-border-subtle",
  failed: "bg-error-500/10 text-error-400 border-error-500/20",
  paused: "bg-warning-500/10 text-warning-400 border-warning-500/20",
  draft: "bg-bg-elevated text-text-secondary border-border-subtle",
  default: "bg-bg-elevated text-text-secondary border-border",
}

const dotStyles: Record<BadgeVariant, string> = {
  running: "bg-cyan-400",
  completed: "bg-success-400",
  scheduled: "bg-text-muted",
  failed: "bg-error-400",
  paused: "bg-warning-400",
  draft: "bg-text-muted",
  default: "bg-text-secondary",
}

export function Badge({ className, variant = "default", dot = false, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", dotStyles[variant])} />}
      {children}
    </span>
  )
}
