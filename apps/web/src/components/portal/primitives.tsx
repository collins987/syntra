import type { ReactNode, ElementType } from "react"

// Shared chrome for portal pages. Server-compatible — no "use client".

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="flex h-full flex-col">{children}</div>
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
}) {
  return (
    <div className="shrink-0 border-b border-border-subtle px-8 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-text-muted">{subtitle}</p>}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  )
}

export function PageBody({ children }: { children: ReactNode }) {
  return <div className="flex-1 overflow-y-auto px-8 py-6">{children}</div>
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: ElementType
  title: string
  body: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
        <Icon className="h-6 w-6 text-text-disabled" />
      </div>
      <p className="text-base font-semibold text-text-primary">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-text-muted">{body}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}

/**
 * The one KPI/metric-tile component. Was two: a plain label/value/hint card
 * here and a richer icon+delta version hand-rolled again inside the
 * dashboard's KpiRow. `icon` and `children` are optional specifically so
 * both call shapes collapse onto this one implementation instead of staying
 * two ways to build the same kind of card.
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  children,
}: {
  icon?: ElementType
  label: string
  value: ReactNode
  /** Ignored when `children` is given — `children` is for richer content
   *  (e.g. a trend chip) that needs more than a single line of text. */
  hint?: ReactNode
  tone?: "default" | "success" | "warning" | "error"
  children?: ReactNode
}) {
  const toneClass =
    tone === "success"
      ? "text-success-400"
      : tone === "warning"
        ? "text-warning-400"
        : tone === "error"
          ? "text-error-400"
          : "text-text-primary"

  return (
    // bg-bg-surface, not bg-bg-elevated: the dashboard rebuild established
    // surface as the top-level card tone and elevated for what sits inside
    // one (inputs, icon badges, hover states) — this card used the older
    // convention and looked a shade off next to the new dashboard.
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors hover:border-cyan-500/30">
      {Icon && (
        <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/20 bg-cyan-500/[0.08]">
          <Icon className="h-4 w-4 text-cyan-400" />
        </span>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p className={`mt-0.5 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {children ?? (hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>)}
    </div>
  )
}

export function Panel({
  title,
  description,
  children,
  actions,
}: {
  title?: string
  description?: string
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    // Same bg-bg-surface rule as KpiCard above.
    <div className="rounded-xl border border-border-subtle bg-bg-surface">
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-6 py-4">
          <div>
            {title && <h2 className="text-sm font-semibold text-text-primary">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </div>
  )
}

// The one status-badge implementation for the portal. A second, differently-
// named copy (variant-based rather than tone-based) lived in @syntra/ui,
// imported by nothing — deleted rather than kept as a second way to do the
// same thing. Tone names match the semantic tokens everywhere else in the
// app (success/warning/error), not shadcn's "destructive" — this codebase
// already has hundreds of `error-*` references; renaming the token family
// itself for one vocabulary preference isn't worth that churn.
const STATUS_BADGE_TONES = {
  neutral: { badge: "bg-border-strong/30 text-text-muted border-border-subtle", dot: "bg-text-muted" },
  cyan: { badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20", dot: "bg-cyan-400" },
  success: { badge: "bg-success-400/10 text-success-400 border-success-400/20", dot: "bg-success-400" },
  warning: { badge: "bg-warning-400/10 text-warning-400 border-warning-400/20", dot: "bg-warning-400" },
  error: { badge: "bg-error-500/10 text-error-400 border-error-500/20", dot: "bg-error-400" },
} as const

export type StatusTone = keyof typeof STATUS_BADGE_TONES

export function StatusBadge({
  tone = "neutral",
  dot = false,
  children,
}: {
  tone?: StatusTone
  /** A leading status dot — the pattern several pages hand-rolled separately
   *  for "running"/"live"/"deploying" indicators. No animation: this is a
   *  restrained, static interface — see PROGRESS.md's 2026-09-20 entry. */
  dot?: boolean
  children: ReactNode
}) {
  const t = STATUS_BADGE_TONES[tone]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${t.badge}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} />}
      {children}
    </span>
  )
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "Never"
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })
}

export function NoOrg({ label }: { label: string }) {
  return (
    <PageShell>
      <PageHeader title={label} />
      <PageBody>
        <EmptyState
          icon={({ className }: { className?: string }) => (
            <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
              <path d="M12 8v4M12 16h.01" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
          title="Finish setting up your workspace"
          body="You're signed in but not part of an organisation yet. Complete onboarding to see your data here."
        />
      </PageBody>
    </PageShell>
  )
}
