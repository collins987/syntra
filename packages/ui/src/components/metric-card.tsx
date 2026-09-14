"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "../lib/utils"
import { Card, CardContent } from "./card"

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
  const isNeutral = trend !== undefined && trend === 0

  return (
    <Card className={cn("relative overflow-hidden", accent && "border-cyan-500/20", className)}>
      {accent && (
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      )}
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wider text-text-muted mb-2">{label}</p>
        <p className={cn("text-2xl font-semibold text-text-primary tabular-nums", accent && "text-cyan-400")}>
          {prefix}
          {value}
          {suffix}
        </p>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1">
            {isPositive && <TrendingUp className="h-3.5 w-3.5 text-success-400" />}
            {isNegative && <TrendingDown className="h-3.5 w-3.5 text-error-400" />}
            {isNeutral && <Minus className="h-3.5 w-3.5 text-text-muted" />}
            <span
              className={cn(
                "text-xs font-medium",
                isPositive && "text-success-400",
                isNegative && "text-error-400",
                isNeutral && "text-text-muted"
              )}
            >
              {isPositive && "+"}
              {trend}%
            </span>
            {trendLabel && <span className="text-xs text-text-muted">{trendLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
