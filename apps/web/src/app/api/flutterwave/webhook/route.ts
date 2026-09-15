import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

interface FLWWebhookPayload {
  event: string
  data: {
    id: number
    tx_ref: string
    amount: number
    currency: string
    status: string
    payment_type: string
    customer: { email: string; name: string }
  }
}

export async function POST(req: NextRequest) {
  // Flutterwave uses a plain-text hash header, not HMAC
  const hash = req.headers.get("verif-hash")
  if (hash !== process.env.FLW_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  let payload: FLWWebhookPayload
  try {
    payload = (await req.json()) as FLWWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  if (payload.event === "charge.completed" && payload.data.status === "successful") {
    const txRef = payload.data.tx_ref

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createServiceClient() as any

      // Find the subscription that was linked with this tx_ref
      const { data: sub } = (await db
        .from("subscriptions")
        .select("id, status")
        .eq("flw_tx_ref", txRef)
        .maybeSingle()) as { data: { id: string; status: string } | null }

      if (sub && sub.status !== "active") {
        await db
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", sub.id)
      }
    } catch {
      // Non-fatal — subscription status will be correct after link-subscription runs
    }
  }

  return NextResponse.json({ received: true })
}
