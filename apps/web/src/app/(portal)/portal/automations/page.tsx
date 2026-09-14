import type { Metadata } from "next"

export const metadata: Metadata = { title: "Automations" }

export default function AutomationsPage() {
  return (
    <div className="animate-fade-in p-6">
      <h1 className="text-xl font-semibold text-text-primary">Automations</h1>
      <p className="mt-1 text-sm text-text-muted">Your active workflows and execution history.</p>
      <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle">
        <p className="text-sm text-text-disabled">Workflow canvas — coming in Phase 3</p>
      </div>
    </div>
  )
}
