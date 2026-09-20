import type { ReactNode } from "react"

export interface DataTableColumn<T> {
  key: string
  header: string
  /** Grid column width: a fixed size ("80px") or a fraction ("1fr"). */
  width: string
  align?: "right"
  render: (row: T) => ReactNode
}

/**
 * The one grid-table shape for genuinely columnar data (leads, invoices,
 * contacts) — as opposed to card-style lists (approvals, integrations),
 * which have per-row actions and multi-line content that a fixed column
 * grid doesn't fit and shouldn't be forced into.
 *
 * Wrapped in overflow-x-auto with a minimum width rather than attempting to
 * collapse columns per breakpoint: that's the strategy the dashboard's own
 * lead table already used successfully, and a responsive column-hiding grid
 * is not something to invent and ship unverified with no browser to check it
 * against.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  minWidth = "640px",
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  minWidth?: string
}) {
  const gridTemplateColumns = columns.map((c) => c.width).join(" ")

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth }}>
        <div
          className="grid gap-4 border-b border-border-subtle/70 px-6 py-3"
          style={{ gridTemplateColumns }}
        >
          {columns.map((c) => (
            <span
              key={c.key}
              className={`text-[10px] font-semibold uppercase tracking-wider text-text-disabled ${
                c.align === "right" ? "text-right" : ""
              }`}
            >
              {c.header}
            </span>
          ))}
        </div>

        <div className="divide-y divide-border-subtle/50">
          {rows.map((row) => (
            <div
              key={row.id}
              className="grid items-center gap-4 px-6 py-3.5 transition-colors hover:bg-bg-elevated/60"
              style={{ gridTemplateColumns }}
            >
              {columns.map((c) => (
                <div key={c.key} className={c.align === "right" ? "text-right" : "min-w-0"}>
                  {c.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
