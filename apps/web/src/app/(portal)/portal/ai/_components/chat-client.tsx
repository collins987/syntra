"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Send, Loader2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react"
import { PageShell, PageHeader, StatusBadge } from "@/components/portal/primitives"

export interface ChatAgent {
  key: string
  name: string
  role: string
  blurb: string
  status: string
  autonomy: number
  tools: string[]
}

interface Message {
  role: "user" | "assistant"
  content: string
}

interface TurnMeta {
  approvals: Array<{ id: string; summary: string }>
  actions: Array<{ capability: string; status: string; error?: string }>
}

const SUGGESTIONS: Record<string, string[]> = {
  ava: [
    "What pages do we have live right now?",
    "Where are our leads coming from this month?",
  ],
  max: [
    "Are any of my automations failing?",
    "Explain the most recent failure in plain English.",
  ],
  leo: [
    "How many leads did we get in the last 30 days?",
    "What does our automation success rate look like?",
  ],
}

export function ChatClient({
  agents,
  canDecide,
}: {
  agents: ChatAgent[]
  canDecide: boolean
}) {
  const [activeKey, setActiveKey] = useState(agents[0]?.key ?? "ava")
  const [conversations, setConversations] = useState<Record<string, Message[]>>({})
  const [meta, setMeta] = useState<Record<string, TurnMeta>>({})
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  const agent = agents.find((a) => a.key === activeKey) ?? agents[0]
  const messages = conversations[activeKey] ?? []
  const turnMeta = meta[activeKey]

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, sending])

  async function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    const history = [...messages, { role: "user" as const, content: trimmed }]
    setConversations((c) => ({ ...c, [activeKey]: history }))
    setInput("")
    setSending(true)
    setError(null)

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey: activeKey, messages: history }),
      })
      const data = (await res.json()) as {
        ok: boolean
        text?: string
        refusal?: string
        error?: string
        approvals?: Array<{ id: string; summary: string }>
        actions?: Array<{ capability: string; status: string; error?: string }>
      }

      if (!res.ok) throw new Error(data.error ?? "The request failed")

      if (data.refusal) {
        setError(data.refusal)
        setConversations((c) => ({ ...c, [activeKey]: messages }))
        return
      }

      setConversations((c) => ({
        ...c,
        [activeKey]: [...history, { role: "assistant", content: data.text ?? "" }],
      }))
      setMeta((m) => ({
        ...m,
        [activeKey]: { approvals: data.approvals ?? [], actions: data.actions ?? [] },
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setConversations((c) => ({ ...c, [activeKey]: messages }))
    } finally {
      setSending(false)
    }
  }

  if (!agent) return null

  return (
    <PageShell>
      <PageHeader
        title="AI Center"
        subtitle="Ask your AI team about your business. They answer from your live data."
      />

      {/* Agent tabs */}
      <div className="shrink-0 border-b border-border-subtle px-8">
        <div className="flex gap-1 overflow-x-auto">
          {agents.map((a) => (
            <button
              key={a.key}
              onClick={() => { setActiveKey(a.key); setError(null) }}
              className={[
                "flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm transition-colors",
                a.key === activeKey
                  ? "border-cyan-500 text-text-primary"
                  : "border-transparent text-text-muted hover:text-text-primary",
              ].join(" ")}
            >
              <span className="font-semibold">{a.name}</span>
              <span className="hidden text-xs text-text-disabled sm:inline">{a.role}</span>
              {a.status !== "active" && <StatusBadge tone="neutral">{a.status}</StatusBadge>}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        <div className="mx-auto max-w-2xl">
          {messages.length === 0 && (
            <div className="mb-8 rounded-xl border border-border-subtle bg-bg-elevated p-6">
              <p className="text-sm font-semibold text-text-primary">{agent.name}</p>
              <p className="mt-1 text-sm text-text-muted">{agent.blurb}</p>
              <p className="mt-3 text-xs text-text-disabled">
                Autonomy Level {agent.autonomy} —{" "}
                {agent.autonomy <= 1
                  ? "prepares actions for you to approve"
                  : "can carry out reversible actions directly"}
              </p>

              <div className="mt-5 flex flex-col gap-2">
                {(SUGGESTIONS[agent.key] ?? []).map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-lg border border-border-subtle bg-bg-surface px-4 py-2.5 text-left text-sm text-text-muted transition-colors hover:border-cyan-500/30 hover:text-text-primary"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-5">
            {messages.map((m, i) => (
              <div
                key={i}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-xl px-4 py-3 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-cyan-500 text-bg-base"
                      : "border border-border-subtle bg-bg-elevated text-text-primary",
                  ].join(" ")}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-2 text-sm text-text-muted">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                {agent.name} is thinking…
              </div>
            )}
          </div>

          {turnMeta && turnMeta.approvals.length > 0 && (
            <div className="mt-5 rounded-xl border border-warning-400/30 bg-warning-400/5 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-warning-400">
                <ShieldAlert className="h-4 w-4" />
                {canDecide ? "Waiting for your approval" : "Waiting for an admin's approval"}
              </p>
              <ul className="mt-2 space-y-1">
                {turnMeta.approvals.map((a) => (
                  <li key={a.id} className="text-sm text-text-muted">
                    {a.summary}
                  </li>
                ))}
              </ul>
              <Link
                href="/portal/approvals"
                className="mt-3 inline-block text-sm font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Review in Approvals →
              </Link>
            </div>
          )}

          {turnMeta && turnMeta.actions.length > 0 && (
            <div className="mt-4 space-y-1.5">
              {turnMeta.actions.map((a, i) => (
                <p
                  key={i}
                  className={`flex items-center gap-2 text-xs ${
                    a.status === "success" ? "text-success-400" : "text-error-400"
                  }`}
                >
                  {a.status === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5" />
                  )}
                  <span className="font-mono">{a.capability}</span>
                  <span>{a.status === "success" ? "done" : (a.error ?? a.status)}</span>
                </p>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
              <p className="text-sm text-error-400">{error}</p>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border-subtle px-8 py-4">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input) }}
          className="mx-auto flex max-w-2xl items-center gap-3"
        >
          <input
            id="ai-chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask ${agent.name} something…`}
            disabled={sending || agent.status !== "active"}
            className="h-11 flex-1 rounded-xl border border-border-subtle bg-bg-elevated px-4 text-sm text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-cyan-500/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !input.trim() || agent.status !== "active"}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-bg-base transition-colors hover:bg-cyan-400 disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </PageShell>
  )
}
