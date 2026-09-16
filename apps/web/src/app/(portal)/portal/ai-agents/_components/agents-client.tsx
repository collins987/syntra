"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, AlertCircle, Pause, Play, Check, Lock } from "lucide-react"
import {
  PageShell, PageHeader, PageBody, Panel, Badge,
} from "@/components/portal/primitives"
import { AUTONOMY_LEVELS } from "@/lib/ai/agents"

export interface AgentView {
  key: string
  name: string
  role: string
  blurb: string
  status: string
  autonomyLevel: number
  effectiveLevel: number
  ceiling: number
  can: string[]
  cannot: string[]
  grantedTools: string[]
  tools: Array<{
    name: string
    description: string
    reachesOutside: boolean
    irreversible: boolean
  }>
}

export function AgentsClient({
  agents,
  isAdmin,
}: {
  agents: AgentView[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function patch(agentKey: string, body: Record<string, unknown>) {
    setBusy(agentKey)
    setError(null)
    try {
      const res = await fetch("/api/ai/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentKey, ...body }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "Could not update this agent")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setBusy(null)
    }
  }

  function toggleTool(agent: AgentView, tool: string) {
    const next = agent.grantedTools.includes(tool)
      ? agent.grantedTools.filter((t) => t !== tool)
      : [...agent.grantedTools, tool]
    patch(agent.key, { grantedTools: next })
  }

  return (
    <PageShell>
      <PageHeader
        title="AI Agents"
        subtitle="Your AI team, what each one is allowed to do, and how much it can do on its own."
      />
      <PageBody>
        {!isAdmin && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-4 py-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-text-disabled" />
            <p className="text-sm text-text-muted">
              Only an organisation admin can change these settings.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-2 rounded-xl border border-error-500/30 bg-error-500/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-error-400" />
            <p className="text-sm text-error-400">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {agents.map((agent) => (
            <Panel
              key={agent.key}
              title={`${agent.name} · ${agent.role}`}
              description={agent.blurb}
              actions={
                <div className="flex items-center gap-2">
                  <Badge tone={agent.status === "active" ? "good" : "neutral"}>
                    {agent.status}
                  </Badge>
                  {isAdmin && (
                    <button
                      onClick={() =>
                        patch(agent.key, {
                          status: agent.status === "active" ? "paused" : "active",
                        })
                      }
                      disabled={busy !== null}
                      className="flex h-8 items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-surface px-3 text-xs text-text-muted transition-colors hover:text-text-primary disabled:opacity-50"
                    >
                      {busy === agent.key ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : agent.status === "active" ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {agent.status === "active" ? "Pause" : "Resume"}
                    </button>
                  )}
                </div>
              }
            >
              <div className="grid gap-6 p-6 lg:grid-cols-2">
                {/* Autonomy */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                    Autonomy
                  </p>
                  <div className="space-y-2">
                    {AUTONOMY_LEVELS.map((lvl) => {
                      const locked = lvl.level > agent.ceiling
                      const current = agent.autonomyLevel === lvl.level
                      return (
                        <button
                          key={lvl.level}
                          onClick={() => patch(agent.key, { autonomyLevel: lvl.level })}
                          disabled={!isAdmin || locked || busy !== null}
                          className={[
                            "flex w-full items-start gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors",
                            current
                              ? "border-cyan-500/50 bg-cyan-500/5"
                              : "border-border-subtle bg-bg-surface",
                            locked || !isAdmin
                              ? "cursor-not-allowed opacity-50"
                              : "hover:border-border",
                          ].join(" ")}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                              current ? "border-cyan-400 bg-cyan-400" : "border-border-strong"
                            }`}
                          >
                            {current && <Check className="h-2.5 w-2.5 text-bg-base" />}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium text-text-primary">
                              Level {lvl.level} · {lvl.name}
                              {locked && (
                                <span className="ml-2 text-[11px] font-normal text-text-disabled">
                                  not available for {agent.name}
                                </span>
                              )}
                            </span>
                            <span className="block text-xs text-text-muted">{lvl.desc}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                  {agent.ceiling < 3 && (
                    <p className="mt-3 text-xs text-text-disabled">
                      {agent.name} is capped at Level {agent.ceiling}. Workflow changes are
                      proposed by {agent.name} and deployed by a person.
                    </p>
                  )}
                </div>

                {/* Tools */}
                <div>
                  <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                    What {agent.name} can use
                  </p>
                  <div className="space-y-2">
                    {agent.tools.map((tool) => {
                      const granted = agent.grantedTools.includes(tool.name)
                      return (
                        <button
                          key={tool.name}
                          onClick={() => toggleTool(agent, tool.name)}
                          disabled={!isAdmin || busy !== null}
                          className={[
                            "flex w-full items-start gap-3 rounded-lg border px-4 py-2.5 text-left transition-colors",
                            granted
                              ? "border-cyan-500/30 bg-cyan-500/5"
                              : "border-border-subtle bg-bg-surface",
                            isAdmin ? "hover:border-border" : "cursor-not-allowed opacity-70",
                          ].join(" ")}
                        >
                          <span
                            className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                              granted ? "border-cyan-400 bg-cyan-400" : "border-border-strong"
                            }`}
                          >
                            {granted && <Check className="h-2.5 w-2.5 text-bg-base" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-[11px] text-text-primary">
                                {tool.name}
                              </span>
                              {tool.irreversible && <Badge tone="warn">always needs approval</Badge>}
                              {!tool.reachesOutside && <Badge tone="neutral">read only</Badge>}
                            </span>
                            <span className="mt-0.5 block text-xs text-text-muted">
                              {tool.description}
                            </span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Envelope */}
                <div className="lg:col-span-2 grid gap-6 border-t border-border-subtle pt-5 sm:grid-cols-2">
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-success-400">
                      Can
                    </p>
                    <ul className="space-y-1">
                      {agent.can.map((c) => (
                        <li key={c} className="text-xs text-text-muted">· {c}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-error-400">
                      Cannot
                    </p>
                    <ul className="space-y-1">
                      {agent.cannot.map((c) => (
                        <li key={c} className="text-xs text-text-muted">· {c}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      </PageBody>
    </PageShell>
  )
}
