import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isCheckStatus } from "@/lib/intasend"
import { KES_AMOUNTS, isPlanId } from "@/lib/pricing"

export async function POST(req: NextRequest) {
  try {
    const { apiRef, invoiceId, orgId, planId } = (await req.json()) as {
      apiRef: string
      invoiceId: string
      orgId: string
      planId: string
    }

    if (!apiRef || !invoiceId || !orgId || !planId) {
      return NextResponse.json(
        { error: "apiRef, invoiceId, orgId, and planId are required" },
        { status: 400 }
      )
    }

    if (!isPlanId(planId)) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Re-verify server-side before writing to DB
    const result = await isCheckStatus(invoiceId)

    if (result.invoice.state !== "COMPLETE") {
      return NextResponse.json(
        { error: `Payment not complete — state: ${result.invoice.state}` },
        { status: 400 }
      )
    }

    // Guard: ensure the paid amount is >= expected plan price (allow 1% tolerance)
    const expectedKes = KES_AMOUNTS[planId] ?? 0
    const paidAmount = parseFloat(result.invoice.net_amount ?? result.invoice.value)
    if (expectedKes > 0 && paidAmount < expectedKes * 0.99) {
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 })
    }

    // 30-day subscription period from payment date
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = (await (supabase as any).from("subscriptions").upsert(
      {
        org_id: orgId,
        payment_provider: "intasend",
        intasend_api_ref: apiRef,
        intasend_invoice_id: invoiceId,
        stripe_subscription_id: null,
        stripe_customer_id: null,
        plan: planId,
        status: "active",
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        metadata: {
          user_id: user.id,
          intasend_value: result.invoice.value,
          intasend_currency: result.invoice.currency,
          intasend_provider: result.invoice.provider,
        },
      },
      { onConflict: "intasend_api_ref" }
    )) as { error: Error | null }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to link subscription"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
