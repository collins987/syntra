import type { Metadata } from "next"

export const metadata: Metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <div className="animate-fade-in p-6">
      <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
      <p className="mt-1 text-sm text-text-muted">Account, team and notifications.</p>
      <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle">
        <p className="text-sm text-text-disabled">Settings panel — coming in Phase 2</p>
      </div>
    </div>
  )
}
