"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, X, Send } from "lucide-react"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface SendResponse {
  ok?: boolean
  reply?: string
  budget?: { remaining_usd: number; over_budget: boolean }
  error?: string
  reason?: string
}

const DRAFT_PLACEHOLDER =
  "Ask about your services, uptime, workflows, or anything you're seeing on your dashboard."
const INTRO_LINE =
  "Hi — I'm Hermes. I can explain what I see across your SYNTRA services. I can't make changes; for that, use Support."

/**
 * Hermes floating-action button. Opens a slide-up chat panel wired to
 * /api/ai/hermes. Advisory only — the server-side guardrails in
 * lib/ai/hermes/chat.ts enforce no-execution regardless of what the UI
 * sends, which lets this component stay simple.
 *
 * Chat state is local to the panel (useState). We don't persist it to the
 * DB because Hermes is session-ephemeral per SYNTRA_SDD.md §4.8 — a client
 * opening the panel starts fresh, which keeps context cost predictable.
 */
export function HermesButton() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, sending])

  async function send() {
    const content = draft.trim()
    if (!content || sending) return
    setError(null)
    setDraft("")

    const next: Message[] = [...messages, { role: "user", content }]
    setMessages(next)
    setSending(true)

    try {
      const res = await fetch("/api/ai/hermes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      })
      const payload = (await res.json().catch(() => ({}))) as SendResponse

      if (!res.ok || !payload.ok || !payload.reply) {
        const message =
          payload.reason === "over_budget"
            ? "You've reached this month's Hermes limit. It resets next month."
            : payload.error ?? "Hermes couldn't answer that right now."
        setError(message)
        return
      }
      setMessages((prev) => [...prev, { role: "assistant", content: payload.reply as string }])
    } catch {
      setError("Network error. Try again in a moment.")
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Hermes assistant"
          className="fixed bottom-20 right-6 z-50 flex h-[32rem] max-h-[calc(100vh-6rem)] w-[22rem] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-modal"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-500/15 text-cyan-400">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text-primary">Hermes</p>
                <p className="text-[10.5px] text-text-disabled">Advisory · read-only</p>
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

          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.length === 0 && (
              <div className="rounded-md border border-border-subtle bg-bg-elevated px-3 py-2 text-xs text-text-muted">
                {INTRO_LINE}
              </div>
            )}
            {messages.map((m, i) => (
              <ChatBubble key={i} message={m} />
            ))}
            {sending && (
              <div className="flex gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-3 py-2 text-xs text-text-disabled">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 [animation-delay:150ms]" />
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400 [animation-delay:300ms]" />
                </span>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-xs text-error-400">
                {error}
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-border-subtle p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={DRAFT_PLACEHOLDER}
                rows={2}
                disabled={sending}
                className="flex-1 resize-none rounded-md border border-border bg-bg-elevated px-2.5 py-1.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !draft.trim()}
                aria-label="Send"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-cyan-500 text-bg-base transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-text-disabled">
              Enter sends. Shift+Enter for a new line.
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

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user"
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap rounded-md px-3 py-2 text-sm ${
          isUser
            ? "bg-cyan-500 text-bg-base"
            : "border border-border-subtle bg-bg-elevated text-text-secondary"
        }`}
      >
        {message.content}
      </div>
    </div>
  )
}
