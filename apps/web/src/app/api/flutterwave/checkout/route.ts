import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { flwInitPayment, FLW_KES_AMOUNTS } from "@/lib/flutterwave"

export async function POST(req: NextRequest) {
  try {
    const { planId } = (await req.json()) as { planId: string }
    if (!planId || !FLW_KES_AMOUNTS[planId]) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    const txRef = `syntra-${planId}-${user.id}-${Date.now()}`
    const amount = FLW_KES_AMOUNTS[planId]!

    const planLabels: Record<string, string> = {
      sites: "Syntra Sites ($297/mo)",
      flow: "Syntra Flow ($497/mo)",
      os: "Syntra OS ($997/mo)",
    }

    const result = await flwInitPayment({
      tx_ref: txRef,
      amount,
      currency: "KES",
      redirect_url: `${appUrl}/api/flutterwave/verify`,
      customer: {
        email: user.email ?? "",
        ...(user.user_metadata?.full_name
          ? { name: user.user_metadata.full_name as string }
          : {}),
      },
      customizations: {
        title: "SYNTRA",
        description: planLabels[planId] ?? "SYNTRA Subscription",
      },
      payment_options: "mpesa,card",
      meta: { user_id: user.id, plan_id: planId },
    })

    if (result.status !== "success" || !result.data?.link) {
      throw new Error("Flutterwave did not return a payment link")
    }

    return NextResponse.json({ url: result.data.link })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Checkout failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
