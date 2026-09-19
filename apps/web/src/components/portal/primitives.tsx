import type { ReactNode, ElementType } from "react"

// Shared chrome for portal pages. Server-compatible — no "use client".

export function PageShell({ children }: { children: ReactNode }) {
  return <div className="animate-fade-in flex h-full flex-col">{children}</div>
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

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: "default" | "good" | "warn" | "bad"
}) {
  const toneClass =
    tone === "good"
      ? "text-success-400"
      : tone === "warn"
        ? "text-warning-400"
        : tone === "bad"
          ? "text-error-400"
          : "text-text-primary"

  return (
    // bg-bg-surface, not bg-bg-elevated: the dashboard rebuild established
    // surface as the top-level card tone and elevated for what sits inside
    // one (inputs, icon badges, hover states) — this card used the older
    // convention and looked a shade off next to the new dashboard.
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      <p className={`mt-2 font-mono text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-text-muted">{hint}</p>}
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
    // Same bg-bg-surface rule as StatCard above.
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

const BADGE_TONES = {
  neutral: "bg-border-strong/30 text-text-muted border-border-subtle",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  good: "bg-success-400/10 text-success-400 border-success-400/20",
  warn: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  bad: "bg-error-500/10 text-error-400 border-error-500/20",
} as const

export type BadgeTone = keyof typeof BADGE_TONES

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-md border px-2.5 py-0.5 text-[11px] font-medium ${BADGE_TONES[tone]}`}
    >
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
