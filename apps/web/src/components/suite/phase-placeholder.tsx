import type { LucideIcon } from "lucide-react"

interface Props {
  icon: LucideIcon
  title: string
  phase: string
  description: string
  bullets?: string[]
}

/**
 * Shared "coming in a later phase" placeholder for suite routes that already
 * have their nav slot but no built-out UI yet. Keeps the empty state honest
 * (phase number named out loud) and consistent across the suite — a design
 * principle borrowed from Core_Design_Principles.md §9: honest iteration
 * reads better than a fake-populated screen.
 */
export function PhasePlaceholder({ icon: Icon, title, phase, description, bullets }: Props) {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
          <p className="text-xs text-text-disabled">{phase}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border-subtle bg-bg-elevated p-6">
        <p className="text-sm text-text-muted">{description}</p>
        {bullets && bullets.length > 0 && (
          <ul className="mt-4 space-y-2">
            {bullets.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-text-secondary">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-cyan-400" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
