import { NextRequest, NextResponse } from "next/server"
import { isCheckStatus } from "@/lib/intasend"

// Polled by the client every few seconds after an STK push to check payment state
export async function GET(req: NextRequest) {
  const invoiceId = new URL(req.url).searchParams.get("invoice_id")
  if (!invoiceId) {
    return NextResponse.json({ error: "invoice_id is required" }, { status: 400 })
  }
  try {
    const result = await isCheckStatus(invoiceId)
    return NextResponse.json({
      state: result.invoice.state,
      invoiceId: result.invoice.invoice_id,
      apiRef: result.invoice.api_ref,
      value: result.invoice.value,
      currency: result.invoice.currency,
      failedReason: result.invoice.failed_reason,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Status check failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
