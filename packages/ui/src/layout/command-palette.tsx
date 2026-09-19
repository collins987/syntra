"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"
import { flatNavigation } from "./navigation"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * ⌘K / Ctrl+K anywhere in the portal. Controlled rather than owning its own
 * open state: the header's search box is a second trigger for the same
 * dialog, so whichever component renders both needs to hold the boolean.
 */
export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [activeIndex, setActiveIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return flatNavigation
    return flatNavigation.filter(
      (item) => item.label.toLowerCase().includes(q) || item.sub?.toLowerCase().includes(q)
    )
  }, [query])

  // The global shortcut works everywhere in the portal, open or not.
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        onOpenChange(true)
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onOpenChange])

  React.useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      // Wait a frame — the input isn't in the DOM yet on the render that flips `open`.
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function go(href: string) {
    router.push(href)
    onOpenChange(false)
  }

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onOpenChange(false)
    } else if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, results.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      const item = results[activeIndex]
      if (item) go(item.href)
    }
  }

  if (!open) return null

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[15vh]"
      onClick={() => onOpenChange(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-modal"
      >
        <div className="flex items-center gap-2.5 border-b border-border-subtle px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="Jump to..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-disabled focus:outline-none"
          />
          <kbd className="shrink-0 rounded border border-border-subtle px-1.5 py-0.5 font-mono text-[10px] text-text-disabled">
            Esc
          </kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-1.5">
          {results.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">No matches for &ldquo;{query}&rdquo;</p>
          ) : (
            results.map((item, i) => (
              <button
                key={item.href}
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  i === activeIndex
                    ? "bg-cyan-500/15 text-cyan-400"
                    : "text-text-secondary hover:bg-bg-elevated/60"
                }`}
              >
                <item.icon className={`h-4 w-4 shrink-0 ${i === activeIndex ? "text-cyan-400" : "text-text-disabled"}`} />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.sub && <span className="shrink-0 text-xs text-text-disabled">{item.sub}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
