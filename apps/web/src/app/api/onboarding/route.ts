import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { sendEmail, APP_URL } from "@/lib/resend"
import { WelcomeEmail } from "@/emails/welcome"

const PLAN_LABELS: Record<string, string> = {
  sites: "Syntra Sites",
  flow: "Syntra Flow",
  ai: "Syntra AI",
  os: "Syntra OS",
}

interface OnboardingPayload {
  orgName: string
  orgSlug: string
  industry: string
  serviceType: string
  projectName: string
  goals: string
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as OnboardingPayload
    const { orgName, orgSlug, industry, serviceType, projectName, goals } = body

    if (!orgName || !orgSlug || !serviceType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any

    // Return existing org if already onboarded
    const { data: existingMember } = (await db
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle()) as { data: { org_id: string } | null }

    if (existingMember?.org_id) {
      return NextResponse.json({ orgId: existingMember.org_id })
    }

    // Create org
    const { data: org, error: orgError } = (await db
      .from("organizations")
      .insert({ name: orgName, slug: orgSlug, plan: serviceType, settings: { industry } })
      .select("id")
      .single()) as { data: { id: string } | null; error: Error | null }

    if (orgError || !org) {
      throw orgError ?? new Error("Failed to create organization")
    }

    // Create membership
    const { error: memberError } = (await db.from("organization_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "CLIENT_ADMIN",
    })) as { error: Error | null }
    if (memberError) throw memberError

    // Create first project
    const { error: projectError } = (await db.from("projects").insert({
      org_id: org.id,
      name: projectName || `${orgName} — ${serviceType}`,
      service_type: serviceType,
      status: "onboarding",
      onboarding_data: { goals, industry },
      brand_data: {},
    })) as { error: Error | null }
    if (projectError) throw projectError

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `${orgName} is live on SYNTRA`,
        template: "welcome",
        orgId: org.id,
        react: WelcomeEmail({
          orgName,
          planName: PLAN_LABELS[serviceType] ?? serviceType,
          dashboardUrl: `${APP_URL}/portal/dashboard`,
        }),
      })
    }

    return NextResponse.json({ orgId: org.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Onboarding failed"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
