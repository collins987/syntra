import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe } from "@/lib/stripe"
import { createServiceClient } from "@/lib/supabase/service"
import { planFromStripePriceId } from "@/lib/pricing"
import { authorizeBillingLink, recordLinkedPlan, refuseIfLinkedElsewhere } from "@/lib/billing-link"

// Links a completed Stripe Checkout session to the caller's organisation.
// See SECURITY_REMEDIATION_PLAN.md §3. The whole claim is verified: the caller is
// the org's admin, the session is theirs and complete, the price is a known plan,
// and the subscription isn't already attached to another org.

interface StripeSubShape {
  id: string
  status: string
  current_period_start: number
  current_period_end: number
  items: { data: Array<{ price: { id: string } }> }
}

export async function POST(req: NextRequest) {
  let body: { sessionId?: unknown; orgId?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === "string" ? body.sessionId : ""
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(sessionId)) {
    return NextResponse.json({ error: "A valid sessionId is required" }, { status: 400 })
  }

  const caller = await authorizeBillingLink(body.orgId)
  if (caller instanceof NextResponse) return caller

  try {
    let session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] })
    } catch {
      return NextResponse.json({ error: "Checkout session not found" }, { status: 404 })
    }

    // The session was created for a signed-in user (api/stripe/checkout sets
    // metadata.user_id). Someone else's session id must not attach their payment.
    if (session.metadata?.["user_id"] !== caller.user.id) {
      return NextResponse.json(
        { error: "This checkout session belongs to a different account" },
        { status: 403 }
      )
    }
    if (session.status !== "complete") {
      return NextResponse.json({ error: "Checkout is not complete" }, { status: 400 })
    }
    if (!session.subscription || typeof session.subscription === "string") {
      return NextResponse.json({ error: "No subscription in session" }, { status: 400 })
    }

    const sub = session.subscription as unknown as StripeSubShape
    const priceId = sub.items.data[0]?.price?.id ?? ""

    // Never guess the plan — recording the wrong tier mis-prices the account.
    const plan = planFromStripePriceId(priceId)
    if (!plan) {
      Sentry.captureMessage(`[stripe-link] unrecognised price ${priceId}`, "error")
      return NextResponse.json(
        { error: "This plan isn't recognised. Our team has been notified." },
        { status: 400 }
      )
    }

    const conflict = await refuseIfLinkedElsewhere("stripe_subscription_id", sub.id, caller.orgId)
    if (conflict) return conflict

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const { error } = await db.from("subscriptions").upsert(
      {
        org_id: caller.orgId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: typeof session.customer === "string" ? session.customer : null,
        plan,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        metadata: { session_id: sessionId, user_id: caller.user.id },
      },
      { onConflict: "stripe_subscription_id" }
    )
    if (error) throw error

    await recordLinkedPlan({
      orgId: caller.orgId,
      userId: caller.user.id,
      plan,
      provider: "stripe",
      reference: sub.id,
    })

    return NextResponse.json({ success: true, plan })
  } catch (err) {
    Sentry.captureException(err)
    console.error("[stripe-link]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Failed to link subscription" }, { status: 500 })
  }
}
