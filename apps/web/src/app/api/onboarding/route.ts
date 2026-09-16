import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { sendEmail, APP_URL } from "@/lib/resend"
import { WelcomeEmail } from "@/emails/welcome"
import { getPlan, isPlanId } from "@/lib/pricing"

// Creates the organisation, its first admin membership and first project.
//
// Identity comes from the session; the writes use the service role because
// members have no write access to org data (migration 011, SECURITY_REMEDIATION_PLAN.md §3).
// Every value that reaches the database is validated here first.
//
// organizations.plan records the plan the customer chose. It is overwritten by
// the verified plan when a payment is linked, and nothing grants access based on it.

interface OnboardingPayload {
  orgName?: unknown
  orgSlug?: unknown
  industry?: unknown
  serviceType?: unknown
  projectName?: unknown
  goals?: unknown
}

const text = (value: unknown, max: number): string =>
  typeof value === "string" ? value.trim().slice(0, max) : ""

/** Canonical slug: lowercase a–z, 0–9 and single hyphens, no hyphen at either end. */
function toSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "")
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  let body: OnboardingPayload
  try {
    body = (await req.json()) as OnboardingPayload
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const orgName = text(body.orgName, 100)
  const slug = toSlug(text(body.orgSlug, 100) || orgName)
  const industry = text(body.industry, 50)
  const serviceType = text(body.serviceType, 20)
  const projectName = text(body.projectName, 120)
  const goals = text(body.goals, 2000)

  if (orgName.length < 2) {
    return NextResponse.json({ error: "Business name is required" }, { status: 400 })
  }
  if (slug.length < 2) {
    return NextResponse.json(
      { error: "Choose a URL name with at least two letters or numbers" },
      { status: 400 }
    )
  }
  if (!isPlanId(serviceType)) {
    return NextResponse.json({ error: "Choose one of the available plans" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  try {
    // One organisation per user for now — a repeat submit returns the existing one.
    const { data: existingMember } = (await db
      .from("organization_members")
      .select("org_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle()) as { data: { org_id: string } | null }

    if (existingMember?.org_id) {
      return NextResponse.json({ orgId: existingMember.org_id })
    }

    const { data: org, error: orgError } = (await db
      .from("organizations")
      .insert({ name: orgName, slug, plan: serviceType, settings: { industry } })
      .select("id")
      .single()) as { data: { id: string } | null; error: { code?: string } | null }

    if (orgError?.code === "23505") {
      return NextResponse.json(
        { error: `The URL name "${slug}" is already taken. Please choose another.` },
        { status: 409 }
      )
    }
    if (orgError || !org) throw orgError ?? new Error("Failed to create organization")

    const { error: memberError } = await db.from("organization_members").insert({
      org_id: org.id,
      user_id: user.id,
      role: "CLIENT_ADMIN",
    })
    if (memberError) {
      // Never leave an organisation nobody can reach.
      await db.from("organizations").delete().eq("id", org.id)
      throw memberError
    }

    const planName = getPlan(serviceType)?.name ?? serviceType

    const { error: projectError } = await db.from("projects").insert({
      org_id: org.id,
      name: projectName || `${orgName} — ${planName}`,
      service_type: serviceType,
      status: "onboarding",
      onboarding_data: { goals, industry },
      brand_data: {},
    })
    // The org and membership are usable without a project; don't fail the signup.
    if (projectError) Sentry.captureException(projectError)

    await db.from("audit_logs").insert({
      org_id: org.id,
      user_id: user.id,
      action: "org_created",
      resource_type: "organization",
      resource_id: org.id,
      metadata: { plan: serviceType },
    })

    if (user.email) {
      await sendEmail({
        to: user.email,
        subject: `${orgName} is live on SYNTRA`,
        template: "welcome",
        orgId: org.id,
        react: WelcomeEmail({
          orgName,
          planName,
          dashboardUrl: `${APP_URL}/portal/dashboard`,
        }),
      })
    }

    return NextResponse.json({ orgId: org.id })
  } catch (err) {
    Sentry.captureException(err)
    console.error("[onboarding]", err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: "We couldn't finish setting up your account. Please try again." },
      { status: 500 }
    )
  }
}
