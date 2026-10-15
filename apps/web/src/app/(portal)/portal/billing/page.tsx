import type { Metadata } from "next"
import type { Subscription, Invoice } from "@syntra/db"
import Link from "next/link"
import { CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { ManageSubscriptionButton } from "./_components/manage-button"
import {
  PageShell, PageHeader, PageBody, Panel, StatusBadge, type StatusTone,
} from "@/components/portal/primitives"
import { DataTable, type DataTableColumn } from "@/components/portal/data-table"
import { getAccountContext } from "@/lib/suite/account"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Billing" }

const SUBSCRIPTION_TONE: Record<string, StatusTone> = {
  active: "success",
  trialing: "cyan",
  past_due: "warning",
  canceled: "error",
  paused: "neutral",
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

const invoiceColumns: DataTableColumn<Invoice>[] = [
  {
    key: "period",
    header: "Period",
    width: "1fr",
    render: (inv) => (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-text-primary">
          {formatDate(inv.period_start)} – {formatDate(inv.period_end)}
        </p>
        <p className="mt-0.5 truncate font-mono text-xs text-text-disabled">
          {inv.stripe_invoice_id ?? inv.id}
        </p>
      </div>
    ),
  },
  {
    key: "amount",
    header: "Amount",
    width: "120px",
    render: (inv) => (
      <span className="font-mono text-sm font-semibold text-text-primary">
        {formatCents(inv.amount_cents, inv.currency)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "90px",
    render: (inv) => (
      <StatusBadge tone={inv.status === "paid" ? "success" : "neutral"}>
        <span className="capitalize">{inv.status}</span>
      </StatusBadge>
    ),
  },
  {
    key: "pdf",
    header: "",
    width: "60px",
    align: "right",
    render: (inv) =>
      inv.pdf_url ? (
        <a
          href={inv.pdf_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-cyan-400 transition-colors hover:text-cyan-300"
        >
          PDF ↗
        </a>
      ) : null,
  },
]

export default async function BillingPage() {
  const account = await getAccountContext()
  if (account.kind === "personal") {
    return (
      <PhasePlaceholder
        icon={CreditCard}
        title="Billing"
        phase="Phase 8 — Billing (Stripe)"
        description="One place for your build fee, maintenance subscription, and invoice history."
        bullets={[
          "Current subscription status at a glance",
          "Invoice history with per-row download",
          "Self-service billing portal via Stripe",
          "No build-fee payment stuck in email — paid links appear here first",
        ]}
      />
    )
  }

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
    <PageShell>
      <PageHeader
        title="Billing"
        subtitle="Subscription, invoices, and usage."
        actions={
          !subscription && (
            <Link
              href="/pricing"
              className="flex h-9 items-center rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors"
            >
              Upgrade plan →
            </Link>
          )
        }
      />
      <PageBody>
      {/* Current subscription */}
      <div className="mb-6">
      <Panel title="Current Plan">
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
                    <StatusBadge tone={SUBSCRIPTION_TONE[subscription.status] ?? "neutral"}>
                      <span className="capitalize">{subscription.status.replace("_", " ")}</span>
                    </StatusBadge>
                    {subscription.payment_provider === "intasend" && (
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
              <ManageSubscriptionButton
                paymentProvider={
                  (subscription.payment_provider as "stripe" | "intasend") ?? "stripe"
                }
              />
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
      </Panel>
      </div>

      {/* Invoice history */}
      <Panel title="Invoice History">
        {invoices.length > 0 ? (
          <DataTable columns={invoiceColumns} rows={invoices} minWidth="560px" />
        ) : (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-text-disabled">No invoices yet.</p>
          </div>
        )}
      </Panel>
      </PageBody>
    </PageShell>
  )
}
