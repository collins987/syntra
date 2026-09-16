import { NextResponse } from "next/server"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import type { PlanId } from "@/lib/pricing"

// Shared authorisation for linking a verified payment to an organisation.
// See SECURITY_REMEDIATION_PLAN.md §3 (F-08, finding 8e).
//
// These writes use the service role, so every ownership rule RLS used to imply
// must be checked here explicitly:
//   - the org comes from the caller's membership, never from the request body
//   - only the org's admin may attach billing to it
//   - a payment that is already attached to a different org is never moved

export interface LinkCaller {
  user: User
  orgId: string
}

export async function authorizeBillingLink(
  requestedOrgId: unknown
): Promise<LinkCaller | NextResponse> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Finish setting up your organisation first" }, { status: 403 })
  }
  if (typeof requestedOrgId === "string" && requestedOrgId && requestedOrgId !== org.org_id) {
    return NextResponse.json({ error: "You can only link billing to your own organisation" }, { status: 403 })
  }
  if (!isOrgAdmin(org.role)) {
    return NextResponse.json(
      { error: "Only an organisation admin can link billing" },
      { status: 403 }
    )
  }

  return { user, orgId: org.org_id }
}

/**
 * Returns a 409 if any subscription row matching `column = value` belongs to a
 * different org. A payment activates exactly one organisation.
 */
export async function refuseIfLinkedElsewhere(
  column: "stripe_subscription_id" | "intasend_invoice_id" | "intasend_api_ref",
  value: string,
  orgId: string
): Promise<NextResponse | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = (await db
    .from("subscriptions")
    .select("org_id")
    .eq(column, value)) as { data: Array<{ org_id: string }> | null; error: Error | null }

  if (error) throw error
  if ((data ?? []).some((row) => row.org_id !== orgId)) {
    return NextResponse.json(
      { error: "This payment is already linked to another organisation" },
      { status: 409 }
    )
  }
  return null
}

/** Records the verified plan and an audit entry once a payment is linked. */
export async function recordLinkedPlan(params: {
  orgId: string
  userId: string
  plan: PlanId
  provider: "stripe" | "intasend"
  reference: string
}): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  await db.from("organizations").update({ plan: params.plan }).eq("id", params.orgId)
  await db.from("audit_logs").insert({
    org_id: params.orgId,
    user_id: params.userId,
    action: "subscription_updated",
    resource_type: "subscription",
    resource_id: null,
    metadata: { plan: params.plan, provider: params.provider, reference: params.reference },
  })
}
