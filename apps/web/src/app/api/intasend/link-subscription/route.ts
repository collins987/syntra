import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"
import { isCheckStatus } from "@/lib/intasend"
import { KES_AMOUNTS, isPlanId } from "@/lib/pricing"
import { authorizeBillingLink, recordLinkedPlan, refuseIfLinkedElsewhere } from "@/lib/billing-link"

// Links a completed M-Pesa (IntaSend) payment to the caller's organisation.
// See SECURITY_REMEDIATION_PLAN.md §3. Nothing from the browser is trusted without
// re-checking it against IntaSend: the invoice must be COMPLETE, in KES, for at
// least the plan price, carry the same api_ref (which names the payer and plan),
// and not be linked to another org.

const REF_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export async function POST(req: NextRequest) {
  let body: { apiRef?: unknown; invoiceId?: unknown; orgId?: unknown; planId?: unknown }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const apiRef = typeof body.apiRef === "string" ? body.apiRef : ""
  const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : ""
  const planId = typeof body.planId === "string" ? body.planId : ""

  if (!REF_PATTERN.test(apiRef) || !REF_PATTERN.test(invoiceId)) {
    return NextResponse.json({ error: "A valid apiRef and invoiceId are required" }, { status: 400 })
  }
  if (!isPlanId(planId)) {
    return NextResponse.json({ error: "Invalid planId" }, { status: 400 })
  }

  const caller = await authorizeBillingLink(body.orgId)
  if (caller instanceof NextResponse) return caller

  try {
    let result
    try {
      result = await isCheckStatus(invoiceId)
    } catch {
      return NextResponse.json({ error: "Could not verify this payment" }, { status: 502 })
    }
    const invoice = result.invoice

    if (invoice.state !== "COMPLETE") {
      return NextResponse.json({ error: "Payment is not complete yet" }, { status: 400 })
    }
    // Binds the invoice to the checkout that created it, so a different paid
    // invoice can't be paired with a fresh api_ref.
    if (invoice.api_ref !== apiRef) {
      return NextResponse.json({ error: "Payment reference mismatch" }, { status: 400 })
    }
    // api/intasend/stk-push creates the ref as syntra-<plan>-<user id>-<timestamp>,
    // so it proves who started this payment and for which plan.
    if (!apiRef.startsWith(`syntra-${planId}-${caller.user.id}-`)) {
      return NextResponse.json(
        { error: "This payment was started by a different account or for a different plan" },
        { status: 403 }
      )
    }
    if (invoice.currency !== "KES") {
      return NextResponse.json({ error: "Unexpected payment currency" }, { status: 400 })
    }

    // Compare the gross amount the customer was charged. net_amount is after
    // IntaSend's fees and would wrongly reject a full-price payment.
    const expectedKes = KES_AMOUNTS[planId]
    const paidKes = Number.parseFloat(invoice.value)
    if (!Number.isFinite(paidKes) || paidKes < expectedKes * 0.99) {
      return NextResponse.json({ error: "Payment amount doesn't match this plan" }, { status: 400 })
    }

    for (const [column, value] of [
      ["intasend_invoice_id", invoiceId],
      ["intasend_api_ref", apiRef],
    ] as const) {
      const conflict = await refuseIfLinkedElsewhere(column, value, caller.orgId)
      if (conflict) return conflict
    }

    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setDate(periodEnd.getDate() + 30)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const { error } = await db.from("subscriptions").upsert(
      {
        org_id: caller.orgId,
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
          user_id: caller.user.id,
          intasend_value: invoice.value,
          intasend_currency: invoice.currency,
          intasend_provider: invoice.provider,
        },
      },
      { onConflict: "intasend_api_ref" }
    )
    if (error) throw error

    await recordLinkedPlan({
      orgId: caller.orgId,
      userId: caller.user.id,
      plan: planId,
      provider: "intasend",
      reference: invoiceId,
    })

    return NextResponse.json({ success: true, plan: planId })
  } catch (err) {
    Sentry.captureException(err)
    console.error("[intasend-link]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Failed to link subscription" }, { status: 500 })
  }
}
