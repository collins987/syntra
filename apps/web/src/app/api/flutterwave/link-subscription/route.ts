import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { flwVerify } from "@/lib/flutterwave"

export async function POST(req: NextRequest) {
  try {
    const { txRef, flwTxId, orgId } = (await req.json()) as {
      txRef: string
      flwTxId: string
      orgId: string
    }

    if (!txRef || !flwTxId || !orgId) {
      return NextResponse.json({ error: "txRef, flwTxId, and orgId are required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Re-verify the transaction server-side before writing to DB
    const result = await flwVerify(flwTxId)
    if (result.data.status !== "successful") {
      return NextResponse.json({ error: "Transaction not successful" }, { status: 400 })
    }
    if (result.data.tx_ref !== txRef) {
      return NextResponse.json({ error: "Transaction reference mismatch" }, { status: 400 })
    }

    // tx_ref format: syntra-{planId}-{userId}-{timestamp}
    const parts = txRef.split("-")
    const planId = parts[1] ?? "sites"

    // Subscription period: 30 days from payment
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = (await (supabase as any).from("subscriptions").upsert(
      {
        org_id: orgId,
        payment_provider: "flutterwave",
        flw_tx_ref: txRef,
        flw_transaction_id: flwTxId,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        plan: planId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        metadata: {
          user_id: user.id,
          flw_amount: result.data.amount,
          flw_currency: result.data.currency,
          flw_payment_type: result.data.payment_type,
        },
      },
      { onConflict: "flw_tx_ref" }
    )) as { error: Error | null }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to link subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
