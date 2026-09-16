import type { Metadata } from "next"
import { createServiceClient } from "@/lib/supabase/service"
import { n8n } from "@/lib/n8n"
import { requirePlatformAdmin } from "@/lib/auth/platform-admin"

export const metadata: Metadata = { title: "Health | Admin" }

export const dynamic = "force-dynamic"

async function probeN8n(): Promise<{ reachable: boolean; detail: string }> {
  if (!process.env.N8N_BASE_URL || !process.env.N8N_API_KEY) {
    return { reachable: false, detail: "N8N_BASE_URL / N8N_API_KEY not configured" }
  }
  try {
    const ok = await n8n.ping()
    return {
      reachable: ok,
      detail: ok ? "Responding" : "Unreachable — the VM may be stopped",
    }
  } catch (err) {
    return { reachable: false, detail: err instanceof Error ? err.message : "Probe failed" }
  }
}

export default async function AdminHealthPage() {
  await requirePlatformAdmin()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const since24h = new Date(Date.now() - 86_400_000).toISOString()

  const [n8nStatus, execRes, blockedRes, emailRes, pendingRes] = await Promise.all([
    probeN8n(),
    db
      .from("workflow_executions")
      .select("status, started_at, error")
      .gte("started_at", since24h),
    db
      .from("action_log")
      .select("id, capability, blocked_reason, created_at, status")
      .eq("status", "blocked")
      .gte("created_at", since24h)
      .order("created_at", { ascending: false })
      .limit(20),
    db.from("email_logs").select("status").gte("created_at", since24h),
    db.from("ai_approvals").select("id").eq("status", "pending"),
  ])

  const executions: Array<{ status: string; error: string | null }> = execRes.data ?? []
  const failed = executions.filter((e) => e.status === "failed")
  const finished = executions.filter((e) => e.status === "completed" || e.status === "failed")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const blocked: any[] = blockedRes.data ?? []
  const emails: Array<{ status: string }> = emailRes.data ?? []
  const emailFailed = emails.filter((e) => e.status === "failed").length

  const services = [
    {
      name: "Automation engine (n8n)",
      ok: n8nStatus.reachable,
      detail: n8nStatus.detail,
    },
    {
      name: "Email delivery (Resend)",
      ok: emailFailed === 0,
      detail:
        emails.length === 0
          ? "No emails in the last 24h"
          : `${emails.length - emailFailed}/${emails.length} delivered`,
    },
    {
      name: "Credential encryption",
      ok: Boolean(process.env.CREDENTIAL_ENCRYPTION_KEY),
      detail: process.env.CREDENTIAL_ENCRYPTION_KEY
        ? "Key configured"
        : "CREDENTIAL_ENCRYPTION_KEY not set — integrations cannot be saved",
    },
    {
      name: "AI gateway (Claude)",
      ok: Boolean(process.env.ANTHROPIC_API_KEY),
      detail: process.env.ANTHROPIC_API_KEY
        ? "Key configured"
        : "ANTHROPIC_API_KEY not set — agents are offline",
    },
  ]

  return (
    <div className="animate-fade-in px-8 py-8">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-text-primary">System health</h1>
        <p className="mt-1 text-sm text-text-muted">Last 24 hours across every organisation.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Executions (24h)"
          value={String(executions.length)}
          hint={`${failed.length} failed`}
          bad={failed.length > 0}
        />
        <Metric
          label="Success rate"
          value={
            finished.length
              ? `${Math.round(((finished.length - failed.length) / finished.length) * 100)}%`
              : "—"
          }
          hint="Of finished runs"
          bad={finished.length > 0 && failed.length / finished.length > 0.2}
        />
        <Metric
          label="Blocked actions"
          value={String(blocked.length)}
          hint="Refused by the policy engine"
          bad={blocked.length > 0}
        />
        <Metric
          label="Pending approvals"
          value={String((pendingRes.data ?? []).length)}
          hint="Across all clients"
        />
      </div>

      <div className="mb-8 rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Services</h2>
        </div>
        <div className="divide-y divide-border-subtle/50">
          {services.map((s) => (
            <div key={s.name} className="flex items-center gap-4 px-6 py-4">
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${
                  s.ok ? "bg-success-400" : "bg-error-400"
                }`}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-text-primary">{s.name}</p>
                <p className="text-xs text-text-disabled">{s.detail}</p>
              </div>
              <span
                className={`shrink-0 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${
                  s.ok
                    ? "border-success-400/20 bg-success-400/10 text-success-400"
                    : "border-error-500/20 bg-error-500/10 text-error-400"
                }`}
              >
                {s.ok ? "OK" : "Attention"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4">
          <h2 className="text-sm font-semibold text-text-primary">Blocked actions</h2>
          <p className="mt-0.5 text-xs text-text-muted">
            Requests the policy engine refused. A spike here usually means a token or agent is
            missing a grant.
          </p>
        </div>
        {blocked.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-text-disabled">
            Nothing blocked in the last 24 hours.
          </p>
        ) : (
          <div className="divide-y divide-border-subtle/50">
            {blocked.map((b) => (
              <div key={b.id} className="px-6 py-3">
                <p className="font-mono text-xs text-text-primary">{b.capability}</p>
                <p className="mt-0.5 text-xs text-error-400">{b.blocked_reason}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  bad = false,
}: {
  label: string
  value: string
  hint: string
  bad?: boolean
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tabular-nums ${
          bad ? "text-error-400" : "text-text-primary"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-text-muted">{hint}</p>
    </div>
  )
}
