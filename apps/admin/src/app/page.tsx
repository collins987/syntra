import type { Metadata } from "next"

export const metadata: Metadata = { title: "System Health" }

const checks = [
  { label: "Web app", status: "operational" },
  { label: "Admin dashboard", status: "operational" },
  { label: "Database (Supabase)", status: "operational" },
  { label: "AI service layer", status: "not configured" },
  { label: "n8n workflows", status: "not configured" },
  { label: "Email (Resend)", status: "not configured" },
  { label: "Payments (Stripe)", status: "not configured" },
]

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-bg-base p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-cyan-500">
            <span className="text-xs font-bold text-bg-base">S</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wide text-text-primary">SYNTRA ADMIN</h1>
            <p className="text-xs text-text-muted">Phase 1 — Foundation</p>
          </div>
        </div>

        <div className="rounded-lg border border-border-subtle bg-bg-surface p-6">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-text-muted">
            System Status
          </h2>
          <p className="mb-5 text-xs text-text-disabled">
            {new Date().toISOString()}
          </p>
          <div className="space-y-1">
            {checks.map((c) => (
              <div key={c.label} className="flex items-center justify-between rounded-md px-3 py-2.5 hover:bg-bg-overlay">
                <span className="text-sm text-text-primary">{c.label}</span>
                <span className={`text-xs font-mono ${
                  c.status === "operational" ? "text-success-400" : "text-text-muted"
                }`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-disabled">
          Full admin dashboard in Phase 3
        </p>
      </div>
    </div>
  )
}
