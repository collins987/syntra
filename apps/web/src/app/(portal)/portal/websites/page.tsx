import type { Metadata } from "next"

export const metadata: Metadata = { title: "Websites" }

export default function WebsitesPage() {
  return (
    <div className="animate-fade-in p-6">
      <h1 className="text-xl font-semibold text-text-primary">Websites</h1>
      <p className="mt-1 text-sm text-text-muted">Manage your AI-generated websites.</p>
      <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle">
        <p className="text-sm text-text-disabled">No websites yet — coming in Phase 3</p>
      </div>
    </div>
  )
}
