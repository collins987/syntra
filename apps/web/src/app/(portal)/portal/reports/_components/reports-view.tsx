"use client"

import { useState } from "react"
import { FileText, Clock, Zap, LifeBuoy, Activity, DollarSign } from "lucide-react"

import type { Report } from "@syntra/db"

interface Props {
  reports: Report[]
  fullName: string
}

interface StructuredData {
  period?: { start: string; end: string }
  projects?: Array<{
    name: string
    uptime_pct: number
    total_checks: number
    latest_status: string | null
  }>
  workflows?: {
    total: number
    active_count: number
    error_count: number
    total_time_saved_minutes: number
    total_cost_saved_usd: number
  }
  support?: {
    opened: number
    resolved: number
    still_open: number
    avg_hours_to_resolve: number | null
  }
}

function formatMonth(iso: string): string {
  const d = new Date(iso + "T00:00:00Z")
  return d.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

function formatDateRange(start: string, end: string): string {
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    })
  return `${fmt(start)} – ${fmt(end)}`
}

export function ReportsView({ reports, fullName }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(reports[0]?.id ?? null)
  const selected = reports.find((r) => r.id === selectedId) ?? null

  const first = fullName.split(" ")[0] ?? fullName

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Reports</h1>
        <p className="mt-1 text-sm text-text-muted">
          Monthly summaries of what we built, what ran, and what was saved.
          Written for you, {first}.
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[18rem,1fr]">
          <aside className="space-y-2">
            {reports.map((r) => {
              const isSelected = r.id === selectedId
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? "border-cyan-500/40 bg-cyan-500/5"
                      : "border-border-subtle bg-bg-elevated hover:border-border"
                  }`}
                >
                  <p className="text-sm font-semibold text-text-primary">
                    {formatMonth(r.period_start)}
                  </p>
                  <p className="mt-0.5 text-[11px] text-text-disabled">
                    {formatDateRange(r.period_start, r.period_end)}
                  </p>
                </button>
              )
            })}
          </aside>

          {selected && <ReportDetail report={selected} />}
        </div>
      )}
    </div>
  )
}

function ReportDetail({ report }: { report: Report }) {
  const structured = (report.data ?? {}) as StructuredData
  const paragraphs = report.summary.split(/\n{2,}/).filter((p) => p.trim())

  return (
    <article className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">
            {formatMonth(report.period_start)}
          </h2>
          <p className="mt-0.5 text-xs text-text-disabled">
            {formatDateRange(report.period_start, report.period_end)}
            {" · "}
            Generated {new Date(report.generated_at).toLocaleDateString()}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] font-medium text-cyan-400">
          <FileText className="h-3 w-3" />
          Summary
        </span>
      </div>

      <div className="space-y-3 border-b border-border-subtle pb-5 text-sm text-text-secondary">
        {paragraphs.map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            {p}
          </p>
        ))}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <MetricTile
          icon={Zap}
          label="Automations"
          primary={`${structured.workflows?.active_count ?? 0} active`}
          secondary={
            structured.workflows
              ? `${structured.workflows.total} total${
                  structured.workflows.error_count > 0
                    ? ` · ${structured.workflows.error_count} error`
                    : ""
                }`
              : "—"
          }
        />
        <MetricTile
          icon={DollarSign}
          label="Value saved (per run)"
          primary={
            structured.workflows
              ? `$${structured.workflows.total_cost_saved_usd.toFixed(2)}`
              : "—"
          }
          secondary={
            structured.workflows
              ? `${structured.workflows.total_time_saved_minutes} minutes`
              : ""
          }
        />
        <MetricTile
          icon={LifeBuoy}
          label="Support"
          primary={
            structured.support
              ? `${structured.support.resolved} resolved`
              : "—"
          }
          secondary={
            structured.support
              ? `${structured.support.opened} opened · ${structured.support.still_open} still open`
              : ""
          }
        />
        <MetricTile
          icon={Activity}
          label="Projects monitored"
          primary={
            structured.projects
              ? `${structured.projects.filter((p) => p.total_checks > 0).length}`
              : "0"
          }
          secondary={
            structured.projects
              ? `${structured.projects.length} total`
              : ""
          }
        />
      </div>

      {structured.projects && structured.projects.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-widest text-text-disabled">
            Project uptime
          </p>
          <div className="space-y-1.5">
            {structured.projects.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-surface px-3 py-1.5 text-xs"
              >
                <span className="text-text-primary">{p.name}</span>
                {p.total_checks > 0 ? (
                  <span className="text-text-secondary">{p.uptime_pct}% uptime</span>
                ) : (
                  <span className="text-text-disabled">No data</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  )
}

function MetricTile({
  icon: Icon,
  label,
  primary,
  secondary,
}: {
  icon: typeof Zap
  label: string
  primary: string
  secondary: string
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-bg-surface p-3">
      <div className="flex items-center gap-2 text-text-muted">
        <Icon className="h-3.5 w-3.5" />
        <p className="text-[10.5px] font-semibold uppercase tracking-widest">{label}</p>
      </div>
      <p className="mt-1 text-base font-semibold text-text-primary">{primary}</p>
      {secondary && (
        <p className="mt-0.5 text-[11px] text-text-disabled">{secondary}</p>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-elevated p-10 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
        <Clock className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-text-primary">
        No reports yet.
      </p>
      <p className="mt-1 text-xs text-text-muted">
        Your first report lands on the 1st of next month. We&apos;ll let you know when it arrives.
      </p>
    </div>
  )
}
