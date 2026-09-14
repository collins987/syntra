"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { cn } from "@syntra/ui"

type StepStatus = "completed" | "running" | "failed" | "pending"
export type RunStatus = "running" | "completed" | "failed" | "scheduled" | "paused"

export interface RunStep {
  name: string
  status: StepStatus
  duration?: string
}

export interface Run {
  id: string
  name: string
  workflowId: string
  detail?: string
  status: RunStatus
  duration?: string
  time: string
  steps?: RunStep[]
}

function StatusDot({ status }: { status: RunStatus | StepStatus }) {
  if (status === "running") {
    return (
      <span className="relative flex h-3 w-3 shrink-0 items-center justify-center">
        <span className="absolute h-3 w-3 animate-ping rounded-full bg-cyan-400 opacity-40" />
        <span className="h-2 w-2 rounded-full bg-cyan-400" />
      </span>
    )
  }
  if (status === "completed") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-success-400" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm3.78-9.72a.75.75 0 0 0-1.06-1.06L6.75 9.19 5.28 7.72a.75.75 0 0 0-1.06 1.06l2 2a.75.75 0 0 0 1.06 0l4.5-4.5Z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === "failed") {
    return (
      <svg className="h-3.5 w-3.5 shrink-0 text-error-400" viewBox="0 0 16 16" fill="currentColor">
        <path fillRule="evenodd" d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16Zm2.78-4.78a.75.75 0 0 1-1.06 1.06L8 10.06l-1.72 1.72a.75.75 0 1 1-1.06-1.06L9.06 9 7.34 7.28a.75.75 0 0 1 1.06-1.06L8 7.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L9.06 9l1.72 1.72Z" clipRule="evenodd" />
      </svg>
    )
  }
  return <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-border-strong" />
}

function StepRow({ step, lineNum }: { step: RunStep; lineNum: number }) {
  return (
    <div className={cn(
      "flex items-center gap-3 py-[3px] pl-10 pr-4 font-mono text-[11px]",
      step.status === "failed" && "bg-error-500/5",
    )}>
      <span className="w-5 shrink-0 select-none text-right text-text-disabled">{lineNum}</span>
      <StatusDot status={step.status} />
      <span className={cn(
        "flex-1",
        step.status === "completed" && "text-text-secondary",
        step.status === "running" && "text-cyan-300",
        step.status === "failed" && "text-error-300",
        step.status === "pending" && "text-text-disabled",
      )}>
        {step.name}
      </span>
      {step.duration && (
        <span className="text-text-disabled">{step.duration}</span>
      )}
    </div>
  )
}

function RunRow({ run }: { run: Run }) {
  const [expanded, setExpanded] = useState(run.status === "running")
  const hasSteps = (run.steps?.length ?? 0) > 0

  return (
    <div>
      <div
        role={hasSteps ? "button" : undefined}
        tabIndex={hasSteps ? 0 : undefined}
        onClick={() => hasSteps && setExpanded((e) => !e)}
        onKeyDown={(e) => e.key === "Enter" && hasSteps && setExpanded((p) => !p)}
        className={cn(
          "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
          hasSteps ? "cursor-pointer hover:bg-bg-overlay" : "cursor-default hover:bg-bg-overlay/50",
          run.status === "failed" && "bg-error-500/[0.06] hover:bg-error-500/[0.1]",
        )}
      >
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 shrink-0 text-text-disabled transition-transform duration-100",
            expanded && "rotate-90",
            !hasSteps && "invisible",
          )}
        />

        <StatusDot status={run.status} />

        <span className={cn(
          "min-w-0 truncate font-medium",
          run.status === "running" && "text-text-primary",
          run.status === "completed" && "text-text-secondary",
          run.status === "failed" && "text-error-300",
          (run.status === "scheduled" || run.status === "paused") && "text-text-muted",
        )}>
          {run.name}
        </span>

        <span className="hidden shrink-0 font-mono text-xs text-text-disabled sm:inline">
          {run.workflowId}{run.detail ? ` · ${run.detail}` : ""}
        </span>

        <div className="flex-1" />

        <span className={cn(
          "hidden w-20 shrink-0 text-right font-mono text-xs md:inline",
          run.status === "running" && "text-cyan-400",
          run.status === "completed" && "text-success-400",
          run.status === "failed" && "text-error-400",
          (run.status === "scheduled" || run.status === "paused") && "text-text-disabled",
        )}>
          {run.status}
        </span>

        <span className="hidden w-10 shrink-0 text-right font-mono text-xs text-text-disabled sm:inline">
          {run.duration ?? ""}
        </span>

        <span className="w-24 shrink-0 text-right font-mono text-xs text-text-disabled">
          {run.time}
        </span>
      </div>

      {expanded && hasSteps && (
        <div className="border-t border-border-subtle/50 bg-bg-base py-1">
          {run.steps!.map((step, i) => (
            <StepRow key={i} step={step} lineNum={i + 1} />
          ))}
        </div>
      )}
    </div>
  )
}

interface RunListProps {
  runs: Run[]
}

export function RunList({ runs }: RunListProps) {
  const counts = {
    running: runs.filter((r) => r.status === "running").length,
    completed: runs.filter((r) => r.status === "completed").length,
    failed: runs.filter((r) => r.status === "failed").length,
    scheduled: runs.filter((r) => r.status === "scheduled").length,
  }

  return (
    <div className="overflow-hidden rounded-md border border-border-subtle">
      <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-surface px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-disabled">
          Automation Runs
        </span>
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
          {counts.running > 0 && (
            <span className="text-cyan-400">{counts.running} running</span>
          )}
          {counts.completed > 0 && (
            <span className="text-success-400">{counts.completed} completed</span>
          )}
          {counts.failed > 0 && (
            <span className="text-error-400">{counts.failed} failed</span>
          )}
          {counts.scheduled > 0 && (
            <span className="text-text-disabled">{counts.scheduled} scheduled</span>
          )}
        </div>
      </div>

      <div className="divide-y divide-border-subtle bg-bg-surface">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </div>

      <div className="border-t border-border-subtle bg-bg-base/40 px-4 py-2">
        <p className="font-mono text-[11px] text-text-disabled">
          Tasks:{" "}
          <span className="text-cyan-400">{counts.running} running</span>
          {" · "}
          <span className="text-success-400">{counts.completed} completed</span>
          {" · "}
          {counts.scheduled} scheduled
          {counts.failed > 0 && (
            <span className="text-error-400"> · {counts.failed} failed</span>
          )}
          {" · "}
          Remote caching disabled
        </p>
      </div>
    </div>
  )
}
