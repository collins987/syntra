type Status = "running" | "completed" | "scheduled" | "failed"

interface Row {
  id: string
  time: string
  timeDetail: string
  category: string
  name: string
  description: string
  status: Status
}

const ROWS: Row[] = [
  { id: "1", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Technical data", name: "Content Generation", description: "Content generation visualization...", status: "completed" },
  { id: "2", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Technical data", name: "Content Generation", description: "Content generation visualization...", status: "completed" },
  { id: "3", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Technical data", name: "Content Generation", description: "Content generation solution.", status: "completed" },
  { id: "4", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Technical data", name: "Content Generation", description: "Content generation visualization...", status: "completed" },
  { id: "5", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Description",    name: "Content Generation", description: "Content content generation.", status: "running" },
  { id: "6", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Description",    name: "Content Generation", description: "Content generation visualization...", status: "completed" },
  { id: "7", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Description",    name: "Content Generation", description: "Content generation tawalization...", status: "completed" },
  { id: "8", time: "21:32:05 JBM", timeDetail: "21:32:05abm", category: "Description",    name: "Content Generation", description: "Content generation tawalization...", status: "scheduled" },
]

const DOT: Record<Status, string> = {
  running:   "bg-cyan-400 animate-pulse shadow-[0_0_6px_rgba(0,229,255,0.6)]",
  completed: "bg-[#2A3A4A]",
  scheduled: "bg-warning-400/80",
  failed:    "bg-error-400",
}

const BADGE: Record<Status, { label: string; cls: string }> = {
  running:   { label: "Running +",  cls: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 ring-1 ring-cyan-500/10" },
  completed: { label: "Completed",  cls: "bg-success-500/10 text-success-400 border border-success-500/20" },
  scheduled: { label: "Scheduled",  cls: "bg-warning-400/10 text-warning-400 border border-warning-400/20" },
  failed:    { label: "Failed",     cls: "bg-error-500/10 text-error-400 border border-error-500/20" },
}

export function LiveActivity() {
  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-border-subtle px-6 py-4">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
          Live System Activity
        </span>
        <button className="flex h-6 w-6 items-center justify-center rounded text-text-disabled transition-colors hover:bg-bg-overlay hover:text-text-muted">
          <svg width="14" height="4" viewBox="0 0 14 4" fill="currentColor">
            <circle cx="1.5" cy="2" r="1.5" /><circle cx="7" cy="2" r="1.5" /><circle cx="12.5" cy="2" r="1.5" />
          </svg>
        </button>
      </div>

      {/* Rows */}
      <div className="flex-1 divide-y divide-border-subtle/50 overflow-y-auto">
        {ROWS.map((row) => (
          <div
            key={row.id}
            className="group flex items-center gap-4 px-6 py-4 transition-colors hover:bg-bg-surface/60"
          >
            {/* Timestamp */}
            <span className="w-[90px] shrink-0 font-mono text-[11px] text-text-disabled">
              {row.time}
            </span>

            {/* Status dot */}
            <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[row.status]}`} />

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-text-disabled">{row.timeDetail}</span>
                <span className="truncate text-[13px] font-semibold text-text-primary">{row.name}</span>
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <span className="shrink-0 font-mono text-[11px] text-text-disabled">{row.category}</span>
                <span className="truncate text-[12px] text-text-muted">{row.description}</span>
              </div>
            </div>

            {/* Badge */}
            <span className={`shrink-0 rounded-md px-2.5 py-1 text-[11px] font-medium ${BADGE[row.status].cls}`}>
              {BADGE[row.status].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
