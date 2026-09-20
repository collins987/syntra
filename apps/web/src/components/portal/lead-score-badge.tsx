export type LeadTier = "A" | "B" | "C" | "D"

const TIER_BADGE: Record<LeadTier, string> = {
  A: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  B: "bg-success-500/10 text-success-400 border-success-500/20",
  C: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  D: "bg-border-strong/30 text-text-muted border-border-subtle",
}

/**
 * Score and tier together — the leads table used to show the tier letter
 * alone even though it sorts by the numeric score underneath, so a "B" lead
 * could be anywhere from 61 to 79 with no way to tell. Both pieces belong
 * together wherever a lead's score appears.
 */
export function LeadScoreBadge({ score, tier }: { score: number; tier: string | null }) {
  const t = (tier as LeadTier | null) ?? "D"
  return (
    <span
      className={`inline-flex w-fit items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${TIER_BADGE[t]}`}
    >
      {score}
      <span className="opacity-70">{t}</span>
    </span>
  )
}
