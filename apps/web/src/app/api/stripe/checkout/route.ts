import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const { priceId } = (await req.json()) as { priceId: string }
    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Reuse existing Stripe customer if one exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingSub } = (await (supabase as any)
      .from("subscriptions")
      .select("stripe_customer_id")
      .limit(1)
      .maybeSingle()) as { data: { stripe_customer_id: string | null } | null }

    const customerId = existingSub?.stripe_customer_id ?? null
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

    const baseParams = {
      mode: "subscription" as const,
      payment_method_types: ["card"] as ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pricing`,
      metadata: { user_id: user.id },
      subscription_data: { metadata: { user_id: user.id } },
    }

    const session = customerId
      ? await stripe.checkout.sessions.create({ ...baseParams, customer: customerId })
      : await stripe.checkout.sessions.create({
          ...baseParams,
          ...(user.email ? { customer_email: user.email } : {}),
        })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout session failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
