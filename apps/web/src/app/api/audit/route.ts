import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"

interface AuditPayload {
  name: string
  email: string
  company: string
  industry: string
  revenue: string
  challenge: string
}

const INTAKE_ORG_ID = process.env.SYNTRA_INTAKE_ORG_ID ?? ""

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditPayload
    const { name, email, company, industry, revenue, challenge } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    if (!INTAKE_ORG_ID) {
      return NextResponse.json({ success: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const score = scoreAuditLead({ revenue, industry })
    const tier = score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D"

    const { error } = (await db.from("leads").insert({
      org_id: INTAKE_ORG_ID,
      email,
      name,
      company: company || null,
      source: "audit",
      score,
      tier,
      status: "new",
      audit_answers: { industry, revenue, challenge },
      audit_report: {},
      metadata: {},
    })) as { error: Error | null }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function scoreAuditLead({ revenue, industry }: { revenue: string; industry: string }): number {
  let score = 40
  const revenueScores: Record<string, number> = {
    "under-10k": 10,
    "10k-50k": 20,
    "50k-250k": 35,
    "250k-1m": 45,
    "over-1m": 50,
  }
  score += revenueScores[revenue] ?? 20
  const highValue = ["ecommerce", "saas", "agency", "real-estate", "finance"]
  if (highValue.includes(industry.toLowerCase())) score += 10
  return Math.min(score, 100)
}
