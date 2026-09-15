const FLW_BASE = "https://api.flutterwave.com/v3"

function secret() {
  return process.env.FLW_SECRET_KEY ?? ""
}

export const FLW_KES_AMOUNTS: Record<string, number> = {
  sites: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_SITES_KES ?? "38700"),
  flow: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_FLOW_KES ?? "64700"),
  os: parseInt(process.env.NEXT_PUBLIC_FLW_PRICE_OS_KES ?? "129700"),
}

export interface FLWPayload {
  tx_ref: string
  amount: number
  currency: "KES"
  redirect_url: string
  customer: { email: string; name?: string }
  customizations: { title: string; description: string }
  payment_options: string
  meta?: Record<string, string>
}

export interface FLWInitResponse {
  status: string
  data: { link: string }
}

export interface FLWVerifyData {
  id: number
  tx_ref: string
  amount: number
  currency: string
  status: string
  payment_type: string
  customer: { email: string; name: string }
  meta: Record<string, string> | null
}

export interface FLWVerifyResponse {
  status: string
  data: FLWVerifyData
}

export async function flwInitPayment(payload: FLWPayload): Promise<FLWInitResponse> {
  const res = await fetch(`${FLW_BASE}/payments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret()}`,
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Flutterwave: ${text}`)
  }
  return res.json() as Promise<FLWInitResponse>
}

export async function flwVerify(transactionId: string): Promise<FLWVerifyResponse> {
  const res = await fetch(`${FLW_BASE}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secret()}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Flutterwave verify: ${text}`)
  }
  return res.json() as Promise<FLWVerifyResponse>
}
