"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Plug, KeyRound, Copy, Check, Trash2 } from "lucide-react"
import {
  PageShell, PageHeader, PageBody, Panel, Badge, timeAgo,
} from "@/components/portal/primitives"

export interface ConnectionView {
  provider: string
  name: string
  description: string
  placeholder: string
  connected: boolean
  hint: string | null
  lastUsedAt: string | null
}

export interface TokenView {
  id: string
  label: string
  capabilities: string[]
  lastUsedAt: string | null
  createdAt: string
}

interface CapabilityView {
  name: string
  description: string
  irreversible: boolean
}

export function IntegrationsClient({
  connections,
  tokens,
  capabilities,
  isAdmin,
}: {
  connections: ConnectionView[]
  tokens: TokenView[]
  capabilities: CapabilityView[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [values, setValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<string[]>([])
  const [newToken, setNewToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function connect(provider: string) {
    const value = (values[provider] ?? "").trim()
    if (!value) return
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch("/api/integrations/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, value }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not connect")
      setValues((v) => ({ ...v, [provider]: "" }))
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function disconnect(provider: string) {
    setBusy(provider)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/credentials?provider=${provider}`, {
        method: "DELETE",
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not disconnect")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function mintToken() {
    if (selected.length === 0) return
    setBusy("token")
    setError(null)
    setNewToken(null)
    try {
      const res = await fetch("/api/integrations/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "n8n", capabilities: selected }),
      })
      const data = (await res.json()) as { token?: string; error?: string }
      if (!res.ok || !data.token) throw new Error(data.error ?? "Could not create the token")
      setNewToken(data.token)
      setSelected([])
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  async function revoke(id: string) {
    setBusy(id)
    setError(null)
    try {
      const res = await fetch(`/api/integrations/token?id=${id}`, { method: "DELETE" })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not revoke the token")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  return (
    <PageShell>
      <PageHeader
        title="Integrations"
        subtitle="Connect the tools SYNTRA acts on. Your keys stay here — your automations never hold them."
      />
      <PageBody>
        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
            <p className="text-sm text-error-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <Panel title="Connected tools" description="Credentials are encrypted and never shown again after saving.">
            <div className="divide-y divide-border-subtle/50">
              {connections.map((c) => (
                <div key={c.provider} className="px-6 py-5">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
                        <Plug className="h-4 w-4 text-text-muted" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                        <p className="mt-0.5 max-w-lg text-xs text-text-muted">{c.description}</p>
                      </div>
                    </div>
                    <Badge tone={c.connected ? "good" : "neutral"}>
                      {c.connected ? "Connected" : "Not connected"}
                    </Badge>
                  </div>

                  {c.connected ? (
                    <div className="flex flex-wrap items-center gap-3 pl-12">
                      <span className="font-mono text-xs text-text-disabled">{c.hint}</span>
                      <span className="text-xs text-text-disabled">
                        Last used {timeAgo(c.lastUsedAt)}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => disconnect(c.provider)}
                          disabled={busy !== null}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-xs text-text-muted transition-colors hover:border-error-500/30 hover:text-error-400 disabled:opacity-50"
                        >
                          {busy === c.provider ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Disconnect
                        </button>
                      )}
                    </div>
                  ) : isAdmin ? (
                    <div className="flex flex-wrap gap-2 pl-12">
                      <input
                        id={`cred-${c.provider}`}
                        type="password"
                        value={values[c.provider] ?? ""}
                        onChange={(e) => setValues((v) => ({ ...v, [c.provider]: e.target.value }))}
                        placeholder={c.placeholder}
                        className="h-9 min-w-0 flex-1 rounded-lg border border-border-subtle bg-bg-surface px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-disabled focus:border-cyan-500/40"
                      />
                      <button
                        onClick={() => connect(c.provider)}
                        disabled={busy !== null || !(values[c.provider] ?? "").trim()}
                        className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500 px-4 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400 disabled:opacity-40"
                      >
                        {busy === c.provider && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Connect
                      </button>
                    </div>
                  ) : (
                    <p className="pl-12 text-xs text-text-disabled">
                      An organisation admin can connect this.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Automation access"
            description="A scoped key your automation engine uses to ask SYNTRA to act. It can only do what you tick."
          >
            <div className="p-6">
              {newToken && (
                <div className="mb-5 rounded-xl border border-cyan-500/40 bg-cyan-500/5 p-4">
                  <p className="text-sm font-semibold text-cyan-400">
                    Copy this now — it is never shown again
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 font-mono text-xs text-text-primary">
                      {newToken}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newToken)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 2000)
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface text-text-muted transition-colors hover:text-text-primary"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-success-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {isAdmin && (
                <>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                    What may this key do?
                  </p>
                  <div className="mb-4 space-y-2">
                    {capabilities.map((cap) => (
                      <label
                        key={cap.name}
                        htmlFor={`cap-${cap.name}`}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-2.5"
                      >
                        <input
                          id={`cap-${cap.name}`}
                          type="checkbox"
                          checked={selected.includes(cap.name)}
                          onChange={(e) =>
                            setSelected((s) =>
                              e.target.checked ? [...s, cap.name] : s.filter((x) => x !== cap.name)
                            )
                          }
                          className="mt-0.5 h-4 w-4 accent-cyan-500"
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-text-primary">{cap.name}</span>
                            {cap.irreversible && <Badge tone="warn">cannot be undone</Badge>}
                          </span>
                          <span className="mt-0.5 block text-xs text-text-muted">
                            {cap.description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={mintToken}
                    disabled={busy !== null || selected.length === 0}
                    className="flex h-10 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base transition-colors hover:bg-cyan-400 disabled:opacity-40"
                  >
                    {busy === "token" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <KeyRound className="h-3.5 w-3.5" />
                    )}
                    Create key
                  </button>
                </>
              )}

              {tokens.length > 0 && (
                <div className="mt-6 space-y-2 border-t border-border-subtle pt-5">
                  {tokens.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border-subtle bg-bg-surface px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-text-primary">{t.label}</p>
                        <p className="mt-0.5 font-mono text-[11px] text-text-disabled">
                          {t.capabilities.join(" · ") || "no capabilities"}
                        </p>
                      </div>
                      <span className="text-xs text-text-disabled">
                        Last used {timeAgo(t.lastUsedAt)}
                      </span>
                      {isAdmin && (
                        <button
                          onClick={() => revoke(t.id)}
                          disabled={busy !== null}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle px-3 text-xs text-text-muted transition-colors hover:border-error-500/30 hover:text-error-400 disabled:opacity-50"
                        >
                          {busy === t.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </PageBody>
    </PageShell>
  )
}
