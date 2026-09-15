import { NextRequest, NextResponse } from "next/server"
import { flwVerify, FLW_KES_AMOUNTS } from "@/lib/flutterwave"

// Flutterwave redirects the user's browser here after payment.
// Query params: status, tx_ref, transaction_id
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status")
  const txRef = searchParams.get("tx_ref")
  const transactionId = searchParams.get("transaction_id")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

  if (status !== "successful" || !transactionId || !txRef) {
    return NextResponse.redirect(`${appUrl}/pricing?error=payment_cancelled`)
  }

  try {
    const result = await flwVerify(transactionId)

    if (result.data.status !== "successful") {
      return NextResponse.redirect(`${appUrl}/pricing?error=payment_failed`)
    }

    // tx_ref format: syntra-{planId}-{userId}-{timestamp}
    const parts = txRef.split("-")
    const planId = parts[1] ?? "sites"

    // Guard: verify charged amount matches expected plan amount
    const expectedKes = FLW_KES_AMOUNTS[planId]
    if (expectedKes && result.data.amount < expectedKes * 0.99) {
      return NextResponse.redirect(`${appUrl}/pricing?error=amount_mismatch`)
    }

    return NextResponse.redirect(
      `${appUrl}/onboarding?tx_ref=${encodeURIComponent(txRef)}&flw_tx_id=${encodeURIComponent(transactionId)}&plan=${planId}`
    )
  } catch {
    return NextResponse.redirect(`${appUrl}/pricing?error=verification_failed`)
  }
}
