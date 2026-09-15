import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

interface ISWebhookPayload {
  invoice_id: string
  state: string
  provider: string
  value: string
  currency: string
  api_ref: string | null
  challenge: string
  failed_reason: string | null
}

export async function POST(req: NextRequest) {
  let payload: ISWebhookPayload
  try {
    payload = (await req.json()) as ISWebhookPayload
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  // IntaSend sends the webhook secret inside the JSON body as "challenge"
  if (payload.challenge !== process.env.INTASEND_WEBHOOK_CHALLENGE) {
    return NextResponse.json({ error: "Invalid challenge" }, { status: 401 })
  }

  if (payload.state === "COMPLETE") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = createServiceClient() as any

      const { data: sub } = (await db
        .from("subscriptions")
        .select("id, status")
        .eq("intasend_invoice_id", payload.invoice_id)
        .maybeSingle()) as { data: { id: string; status: string } | null }

      if (sub && sub.status !== "active") {
        await db
          .from("subscriptions")
          .update({ status: "active", updated_at: new Date().toISOString() })
          .eq("id", sub.id)
      }
    } catch {
      // Non-fatal — subscription confirmed via link-subscription during onboarding
    }
  }

  return NextResponse.json({ received: true })
}
