import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"
import { planFromStripePriceId } from "@/lib/pricing"

interface StripeSubShape {
  id: string
  status: string
  customer: string
  current_period_start: number
  current_period_end: number
  items: { data: Array<{ price: { id: string } }> }
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId, orgId } = (await req.json()) as {
      sessionId: string
      orgId: string
    }

    if (!sessionId || !orgId) {
      return NextResponse.json({ error: "sessionId and orgId are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    })

    if (!session.subscription || typeof session.subscription === "string") {
      return NextResponse.json({ error: "No subscription in session" }, { status: 400 })
    }

    const sub = session.subscription as unknown as StripeSubShape
    const priceId = sub.items.data[0]?.price?.id ?? ""

    // Never guess the plan — recording the wrong tier mis-prices the account and
    // under-delivers the service the customer actually paid for.
    const plan = planFromStripePriceId(priceId)
    if (!plan) {
      return NextResponse.json(
        { error: `Unrecognised Stripe price ${priceId}. Check NEXT_PUBLIC_STRIPE_PRICE_* env vars.` },
        { status: 400 }
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = (await (supabase as any).from("subscriptions").upsert(
      {
        org_id: orgId,
        stripe_subscription_id: sub.id,
        stripe_customer_id: session.customer as string,
        plan,
        status: sub.status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        metadata: { session_id: sessionId },
      },
      { onConflict: "stripe_subscription_id" }
    )) as { error: Error | null }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to link subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
