"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import * as Dialog from "@radix-ui/react-dialog"
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
 *
 * Built on Radix's Dialog primitive rather than a hand-rolled fixed div —
 * that gets focus trapping, return-focus-on-close, Escape-to-close, and
 * portal rendering for free, all of which the previous version approximated
 * by hand (a manual requestAnimationFrame to focus the input, no focus trap
 * at all). The only thing still hand-built here is the list's own
 * arrow-key/Enter navigation, which is app logic Radix has no opinion on.
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
    }
  }, [open])

  React.useEffect(() => {
    setActiveIndex(0)
  }, [query])

  function go(href: string) {
    router.push(href)
    onOpenChange(false)
  }

  // Escape is left to Radix's own handling (it closes the dialog natively);
  // this only needs to own the list-navigation keys.
  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
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

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          onOpenAutoFocus={(e) => {
            // Radix's default focuses the Content div itself; the search
            // input is what should actually receive the cursor.
            e.preventDefault()
            inputRef.current?.focus()
          }}
          className="fixed left-1/2 top-[15vh] z-50 w-full max-w-lg -translate-x-1/2 overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-modal"
        >
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <Dialog.Description className="sr-only">
            Search and jump to any page in the portal.
          </Dialog.Description>

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
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
