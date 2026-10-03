import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/service"
import { ensureScoringPolicy, scoreLead, INTERESTED_SERVICES } from "@/lib/leads/scoring"
import type { InterestedService } from "@syntra/db"

interface AuditPayload {
  name: string
  email: string
  company: string
  industry: string
  revenue: string
  challenge: string
  interested_service?: string
}

const INTAKE_ORG_ID = process.env.SYNTRA_INTAKE_ORG_ID ?? ""

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AuditPayload
    const { name, email, company, industry, revenue, challenge, interested_service } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 })
    }

    let service: InterestedService | null = null
    if (interested_service) {
      if (!INTERESTED_SERVICES.includes(interested_service as InterestedService)) {
        return NextResponse.json(
          { error: "`interested_service` must be one of sites, flow, growth, os" },
          { status: 400 }
        )
      }
      service = interested_service as InterestedService
    }

    if (!INTAKE_ORG_ID) {
      return NextResponse.json({ success: true })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const createdAt = new Date().toISOString()

    // Same deterministic engine crm.upsert uses — this is the only other
    // write path into `leads` (see Lead Intelligence audit), so it gets the
    // same engine rather than its own separate heuristic. This replaces the
    // old ad hoc scoreAuditLead(), which had no concept of interested_service
    // at all and so could never award the service-interest rule's points.
    const policy = await ensureScoringPolicy(INTAKE_ORG_ID)
    const { score, tier } = scoreLead(
      {
        interested_service: service,
        source: "audit",
        revenue: revenue || null,
        industry: industry || null,
        created_at: createdAt,
        company: company || null,
      },
      policy
    )

    const { error } = (await db.from("leads").insert({
      org_id: INTAKE_ORG_ID,
      email,
      name,
      company: company || null,
      source: "audit",
      interested_service: service,
      score,
      tier,
      status: "new",
      audit_answers: { industry, revenue, challenge },
      audit_report: {},
      metadata: {},
      created_at: createdAt,
    })) as { error: Error | null }

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Submission failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
