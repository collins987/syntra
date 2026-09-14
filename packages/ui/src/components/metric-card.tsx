"use client"

import * as React from "react"
import { TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "../lib/utils"

interface MetricCardProps {
  label: string
  value: string | number
  trend?: number
  trendLabel?: string
  prefix?: string
  suffix?: string
  accent?: boolean
  className?: string
}

export function MetricCard({
  label,
  value,
  trend,
  trendLabel,
  prefix,
  suffix,
  accent = false,
  className,
}: MetricCardProps) {
  const isPositive = trend !== undefined && trend > 0
  const isNegative = trend !== undefined && trend < 0

  return (
    <div
      className={cn(
        "rounded-md border bg-bg-surface px-4 py-3",
        accent ? "border-cyan-500/30" : "border-border-subtle",
        className,
      )}
    >
      <p className="font-mono text-[10px] uppercase tracking-wider text-text-disabled">
        {label}
      </p>
      <p
        className={cn(
          "mt-1.5 font-mono text-xl font-semibold tabular-nums",
          accent ? "text-cyan-400" : "text-text-primary",
        )}
      >
        {prefix}
        {value}
        {suffix}
      </p>
      {trend !== undefined && (
        <div className="mt-1 flex items-center gap-1 font-mono text-[11px]">
          {isPositive && <TrendingUp className="h-3 w-3 text-success-400" />}
          {isNegative && <TrendingDown className="h-3 w-3 text-error-400" />}
          <span
            className={cn(
              isPositive && "text-success-400",
              isNegative && "text-error-400",
              !isPositive && !isNegative && "text-text-disabled",
            )}
          >
            {isPositive && "+"}
            {trend}%
          </span>
          {trendLabel && (
            <span className="text-text-disabled">{trendLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}
