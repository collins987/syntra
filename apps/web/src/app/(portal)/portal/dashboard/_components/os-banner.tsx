import Link from "next/link"
import { Layers } from "lucide-react"
import { getPlan } from "@/lib/pricing"

// Copy comes from lib/pricing.ts rather than being written here again — the
// landing and pricing pages already pull OS's name and summary from there,
// and a fourth hand-typed copy of it is a fourth place for the two to drift.
export function OsBanner() {
  const os = getPlan("os")
  if (!os) return null

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10">
          <Layers className="h-5 w-5 text-cyan-400" />
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-text-primary">{os.name}</p>
            {os.badge && (
              <span className="rounded-full bg-cyan-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-bg-base">
                {os.badge}
              </span>
            )}
          </div>
          <p className="mt-0.5 max-w-md text-[12.5px] leading-relaxed text-text-muted">
            {os.summary}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <Link
          href="/pricing"
          className="text-[11.5px] text-text-muted transition-colors hover:text-text-primary"
        >
          Compare plans
        </Link>
        <Link
          href="/portal/billing"
          className="flex h-9 shrink-0 items-center rounded-lg bg-cyan-500 px-4 text-[12.5px] font-semibold text-bg-base shadow-glow-sm transition-colors hover:bg-cyan-400"
        >
          Upgrade to Syntra OS →
        </Link>
      </div>
    </div>
  )
}
