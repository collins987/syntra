// The budget progress bar existed three times, independently: here, inside
// the dashboard's AiCost, and inline in the /portal/ai-usage page — the
// latter two even disagreed on when to turn amber, since ai-usage hardcoded
// 80% while AiCost read the org's actual configured alert_at_percent. One
// implementation, one threshold, computed once.

export function UsageMeter({
  label = "Monthly budget",
  spentLabel,
  limitLabel,
  percent,
  alertAtPercent = 80,
  footnote,
}: {
  label?: string
  /** Pre-formatted so this component stays currency-agnostic — "$12.34", "KES 1,200". */
  spentLabel: string
  limitLabel: string
  /** 0–100, already clamped by the caller against its own zero-limit case. */
  percent: number
  alertAtPercent?: number
  footnote?: string | undefined
}) {
  const overLimit = percent >= 100
  const nearLimit = !overLimit && percent >= alertAtPercent
  const barTone = overLimit ? "bg-error-400" : nearLimit ? "bg-warning-400" : "bg-cyan-500"
  const textTone = overLimit ? "text-error-400" : nearLimit ? "text-warning-400" : "text-text-disabled"

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-muted">{label}</span>
        <span className={`font-mono tabular-nums ${textTone}`}>
          {spentLabel} / {limitLabel}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg-elevated">
        <div
          className={`h-full rounded-full transition-[width] ${barTone}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      {footnote && <p className="mt-2 text-xs text-text-disabled">{footnote}</p>}
    </div>
  )
}
