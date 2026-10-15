"use client"

import { useState } from "react"
import { Bot, X } from "lucide-react"

/**
 * Hermes floating-action button. Phase 2 renders the button + an empty slide-up
 * panel; Phase 7 wires the real chat (/api/ai/chat, budget enforcement, and
 * the read-only client-context builder). Pre-wiring the panel now means Phase 7
 * only has to drop the chat body in — the shell position, animation and
 * styling stay fixed.
 *
 * The panel is intentionally transient (not routed): Hermes is advisory, not
 * a destination; stashing its state in the URL would promote it beyond the
 * assistant role defined in SYNTRA_SDD.md §4.8.
 */
export function HermesButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Hermes assistant"
          className="fixed bottom-20 right-6 z-50 w-[22rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border-subtle bg-bg-surface shadow-modal"
        >
          <div className="flex items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">Hermes</p>
                <p className="text-[10.5px] text-text-disabled">Advisory assistant</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close Hermes"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-text-muted transition hover:bg-bg-overlay/40 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="p-6 text-center">
            <p className="text-sm text-text-muted">
              Hermes isn&apos;t available yet — it goes live in a later release.
            </p>
            <p className="mt-2 text-[11px] text-text-disabled">
              Phase 7 wires the read-only assistant.
            </p>
          </div>
        </div>
      )}

      <button
        type="button"
        aria-label={open ? "Close Hermes" : "Open Hermes"}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500 text-bg-base shadow-glow-sm transition hover:bg-cyan-400"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>
    </>
  )
}
