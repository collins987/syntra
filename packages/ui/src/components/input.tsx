import * as React from "react"
import { cn } from "../lib/utils"

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ className, label, error, hint, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted transition-colors duration-[120ms]",
          "focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-error-500 focus:border-error-500 focus:ring-error-500/50",
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-error-400">{error}</p>}
    </div>
  )
}
