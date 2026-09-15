import type { Metadata } from "next"
import type { Subscription, Invoice } from "@syntra/db"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { ManageSubscriptionButton } from "./_components/manage-button"

export const metadata: Metadata = { title: "Billing" }

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-500/10 text-success-400 border-success-500/20",
  trialing: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  past_due: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  canceled: "bg-error-500/10 text-error-400 border-error-500/20",
  paused: "bg-border-strong/30 text-text-muted border-border-subtle",
}

function formatDate(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatCents(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

export default async function BillingPage() {
  const org = await getUserOrg()
  const supabase = await createClient()

  let subscription: Subscription | null = null
  let invoices: Invoice[] = []

  if (org) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const [subRes, invRes] = (await Promise.all([
      db.from("subscriptions").select("*").eq("org_id", org.org_id)
        .order("created_at", { ascending: false }).limit(1).maybeSingle(),
      db.from("invoices").select("*").eq("org_id", org.org_id)
        .order("created_at", { ascending: false }).limit(20),
    ])) as [
      { data: Subscription | null },
      { data: Invoice[] | null },
    ]
    subscription = subRes.data
    invoices = invRes.data ?? []
  }

  return (
    <div className="animate-fade-in p-8">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Billing</h1>
          <p className="mt-1 text-sm text-text-muted">Subscription, invoices, and usage.</p>
        </div>
        {!subscription && (
          <Link
            href="/pricing"
            className="flex h-9 items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
          >
            Upgrade plan →
          </Link>
        )}
      </div>

      {/* Current subscription */}
      <div className="mb-6 rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Current Plan
          </span>
        </div>
        <div className="px-6 py-5">
          {subscription ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                  <span className="text-sm font-bold text-cyan-400">
                    {subscription.plan.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-text-primary capitalize">
                      Syntra {subscription.plan}
                    </p>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${
                        STATUS_STYLES[subscription.status] ?? STATUS_STYLES.paused
                      }`}
                    >
                      {subscription.status.replace("_", " ")}
                    </span>
                    {subscription.payment_provider === "flutterwave" && (
                      <span className="rounded-md border border-border-subtle bg-bg-surface px-2 py-0.5 text-[11px] text-text-disabled">
                        M-Pesa 🇰🇪
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-text-muted">
                    Renews {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
              <ManageSubscriptionButton paymentProvider={subscription.payment_provider ?? "stripe"} />
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-text-primary">No active subscription</p>
                <p className="mt-0.5 text-sm text-text-muted">Choose a plan to get started.</p>
              </div>
              <Link
                href="/pricing"
                className="flex h-9 items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors"
              >
                View plans →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Invoice history */}
      <div className="rounded-xl border border-border-subtle bg-bg-elevated">
        <div className="border-b border-border-subtle px-6 py-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">
            Invoice History
          </span>
        </div>
        {invoices.length > 0 ? (
          <div className="divide-y divide-border-subtle/50">
            {invoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-text-disabled">
                    {inv.stripe_invoice_id ?? inv.id}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-semibold text-text-primary">
                    {formatCents(inv.amount_cents, inv.currency)}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-medium capitalize ${
                      inv.status === "paid"
                        ? "border-success-500/20 bg-success-500/10 text-success-400"
                        : "border-border-subtle bg-bg-surface text-text-muted"
                    }`}
                  >
                    {inv.status}
                  </span>
                  {inv.pdf_url && (
                    <a
                      href={inv.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      PDF ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-text-disabled">No invoices yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
