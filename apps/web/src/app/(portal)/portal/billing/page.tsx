import type { Metadata } from "next"

export const metadata: Metadata = { title: "Billing" }

export default function BillingPage() {
  return (
    <div className="animate-fade-in p-6">
      <h1 className="text-xl font-semibold text-text-primary">Billing</h1>
      <p className="mt-1 text-sm text-text-muted">Invoices, subscription and usage.</p>
      <div className="mt-8 flex h-48 items-center justify-center rounded-lg border border-dashed border-border-subtle">
        <p className="text-sm text-text-disabled">Stripe billing — coming in Phase 2</p>
      </div>
    </div>
  )
}
