import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { isSTKPush, IS_KES_AMOUNTS, normalizeKenyanPhone } from "@/lib/intasend"

export async function POST(req: NextRequest) {
  try {
    const { planId, phone } = (await req.json()) as { planId: string; phone: string }

    if (!planId || !IS_KES_AMOUNTS[planId]) {
      return NextResponse.json({ error: "Invalid planId" }, { status: 400 })
    }
    if (!phone || phone.trim().length < 9) {
      return NextResponse.json({ error: "Valid phone number required" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const normalizedPhone = normalizeKenyanPhone(phone.trim())
    const apiRef = `syntra-${planId}-${user.id}-${Date.now()}`
    const amount = IS_KES_AMOUNTS[planId]!

    const result = await isSTKPush({
      amount,
      phone_number: normalizedPhone,
      api_ref: apiRef,
      mobile_tarrif: "BUSINESS-PAYS",
    })

    return NextResponse.json({
      invoiceId: result.invoice.invoice_id,
      apiRef,
      planId,
      state: result.invoice.state,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "STK push failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
