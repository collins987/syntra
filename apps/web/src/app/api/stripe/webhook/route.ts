import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"

interface StripeSub {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at: number | null
}

interface StripeInvoice {
  id: string
  subscription: string | { id: string } | null
  amount_paid: number
  currency: string
  invoice_pdf: string | null
  period_start: number | null
  period_end: number | null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature") ?? ""
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? ""

  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: Awaited<ReturnType<typeof stripe.webhooks.constructEventAsync>>
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Signature verification failed"
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  try {
    switch (event.type) {
      case "customer.subscription.updated": {
        const sub = event.data.object as unknown as StripeSub
        await db.from("subscriptions").update({
          status: sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at: sub.cancel_at ? new Date(sub.cancel_at * 1000).toISOString() : null,
        }).eq("stripe_subscription_id", sub.id)
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as unknown as StripeSub
        await db.from("subscriptions").update({ status: "canceled" }).eq("stripe_subscription_id", sub.id)
        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as unknown as StripeInvoice
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as { id: string } | null)?.id ?? null
        if (!subId) break

        const { data: sub } = (await db
          .from("subscriptions")
          .select("org_id")
          .eq("stripe_subscription_id", subId)
          .maybeSingle()) as { data: { org_id: string } | null }

        if (sub) {
          await db.from("invoices").upsert({
            org_id: sub.org_id,
            stripe_invoice_id: invoice.id,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            status: "paid",
            pdf_url: invoice.invoice_pdf,
            period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
            period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          }, { onConflict: "stripe_invoice_id" })
        }
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as unknown as StripeInvoice
        const subId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription as { id: string } | null)?.id ?? null
        if (!subId) break

        await db.from("subscriptions").update({ status: "past_due" }).eq("stripe_subscription_id", subId)
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Webhook processing failed"
    console.error("[stripe-webhook]", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
