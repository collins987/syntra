import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import { planFromStripePriceId } from "@/lib/pricing"
import { recordLinkedPlan, refuseIfLinkedElsewhere } from "@/lib/billing-link"

interface StripeSub {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  cancel_at: number | null
}

interface CheckoutSession {
  id: string
  mode: string
  customer: string | { id: string } | null
  subscription: string | { id: string } | null
  metadata: Record<string, string> | null
}

interface StripeSubWithItems {
  status: string
  current_period_start: number
  current_period_end: number
  items: { data: Array<{ price: { id: string } }> }
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
      // A customer who pays and closes the tab never reaches the success_url,
      // so /api/stripe/link-subscription is never called and they end up with
      // no subscription row at all. This is the same link, done server-side
      // from a Stripe-signed event, and it keeps every guard the manual path
      // has: the plan is resolved from the real price, and a subscription
      // already attached to another org is never moved.
      case "checkout.session.completed": {
        const session = event.data.object as unknown as CheckoutSession
        if (session.mode !== "subscription" || !session.subscription) break

        // Set by our own /api/stripe/checkout. Without it there is no way to
        // tell whose payment this is, and guessing would attach it to the wrong org.
        const userId = session.metadata?.["user_id"]
        if (!userId) break

        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id

        // subscriptions.org_id is NOT NULL, so a buyer who hasn't onboarded yet
        // has nothing to attach to. Flag it rather than invent an organisation.
        const { data: membership } = (await db
          .from("organization_members")
          .select("org_id")
          .eq("user_id", userId)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle()) as { data: { org_id: string } | null }

        if (!membership) {
          Sentry.captureMessage(
            `[stripe-webhook] paid checkout ${session.id} for user ${userId} has no organisation yet — subscription ${subId} is unlinked`,
            "warning"
          )
          break
        }

        const sub = (await stripe.subscriptions.retrieve(subId)) as unknown as StripeSubWithItems
        const plan = planFromStripePriceId(sub.items.data[0]?.price?.id ?? "")
        if (!plan) {
          Sentry.captureMessage(
            `[stripe-webhook] unrecognised price on subscription ${subId}`,
            "error"
          )
          break
        }

        if (await refuseIfLinkedElsewhere("stripe_subscription_id", subId, membership.org_id)) break

        await db.from("subscriptions").upsert(
          {
            org_id: membership.org_id,
            stripe_subscription_id: subId,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
            plan,
            status: sub.status,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            metadata: { session_id: session.id, user_id: userId, linked_by: "webhook" },
          },
          { onConflict: "stripe_subscription_id" }
        )

        await recordLinkedPlan({
          orgId: membership.org_id,
          userId,
          plan,
          provider: "stripe",
          reference: subId,
        })
        break
      }

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
