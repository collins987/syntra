// IntaSend REST API client — M-Pesa STK Push + payment status
// Docs: https://developers.intasend.com

function base() {
  return process.env.INTASEND_SANDBOX === "false"
    ? "https://api.intasend.com/api/v1"
    : "https://sandbox.intasend.com/api/v1"
}

function secret() {
  return process.env.INTASEND_SECRET_KEY ?? ""
}

function authHeader() {
  return { Authorization: `Bearer ${secret()}` }
}

export const IS_KES_AMOUNTS: Record<string, number> = {
  sites: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_SITES_KES ?? "38700"),
  flow: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_FLOW_KES ?? "64700"),
  os: parseInt(process.env.NEXT_PUBLIC_INTASEND_PRICE_OS_KES ?? "129700"),
}

export function normalizeKenyanPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  if (digits.startsWith("254")) return digits
  if (digits.startsWith("0")) return "254" + digits.slice(1)
  if (digits.startsWith("7") || digits.startsWith("1")) return "254" + digits
  return digits
}

// ── STK Push ─────────────────────────────────────────────────────────────────

export interface ISStkPushPayload {
  amount: number
  phone_number: string // 254XXXXXXXXX format
  api_ref: string
  mobile_tarrif?: "BUSINESS-PAYS" | "CUSTOMER-PAYS"
}

export interface ISStkPushResponse {
  id: string
  invoice: {
    invoice_id: string
    state: string
    provider: string
    value: string
    currency: string
    api_ref: string | null
    created_at: string
  }
}

export async function isSTKPush(payload: ISStkPushPayload): Promise<ISStkPushResponse> {
  const res = await fetch(`${base()}/payment/mpesa-stk-push/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IntaSend STK: ${text}`)
  }
  return res.json() as Promise<ISStkPushResponse>
}

// ── Payment status ────────────────────────────────────────────────────────────

export interface ISStatusResponse {
  invoice: {
    invoice_id: string
    state: "PENDING" | "PROCESSING" | "FAILED" | "CANCELED" | "PARTIAL" | "COMPLETE" | "RETRY"
    provider: string
    value: string
    net_amount: string
    currency: string
    api_ref: string | null
    mpesa_reference: string | null
    failed_reason: string | null
  }
  meta: {
    id: string
    customer: { email: string; phone_number: string; name: string }
  }
}

export async function isCheckStatus(invoiceId: string): Promise<ISStatusResponse> {
  const res = await fetch(`${base()}/payment/status/`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ invoice_id: invoiceId }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`IntaSend status: ${text}`)
  }
  return res.json() as Promise<ISStatusResponse>
}
