import * as React from "react"
import { cn } from "../lib/utils"

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-[120ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base disabled:pointer-events-none disabled:opacity-40",
        {
          "rounded-md": size === "sm" || size === "md",
          "rounded-lg": size === "lg",
        },
        {
          "bg-cyan-500 text-bg-base hover:bg-cyan-400 shadow-glow-sm": variant === "primary",
          "border border-border bg-transparent text-text-primary hover:bg-bg-overlay": variant === "secondary",
          "bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-overlay": variant === "ghost",
          "bg-error-600 text-white hover:bg-error-500": variant === "destructive",
        },
        {
          "h-8 px-3 text-xs gap-1.5": size === "sm",
          "h-9 px-4 text-sm gap-2": size === "md",
          "h-11 px-6 text-base gap-2": size === "lg",
        },
        className
      )}
      {...props}
    />
  )
}
