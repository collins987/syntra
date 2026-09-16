import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"

const MAX_MONTHLY_USD = 5000

export async function PATCH(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json(
      { error: "Only an organisation admin can change the AI budget" },
      { status: 403 }
    )
  }

  let body: { monthlyLimitUsd?: number; hardStop?: boolean }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const update: Record<string, any> = {}

  if (body.monthlyLimitUsd !== undefined) {
    const limit = Number(body.monthlyLimitUsd)
    if (!Number.isFinite(limit) || limit < 0 || limit > MAX_MONTHLY_USD) {
      return NextResponse.json(
        { error: `Monthly limit must be between $0 and $${MAX_MONTHLY_USD}` },
        { status: 400 }
      )
    }
    update["monthly_limit_usd"] = limit
  }

  if (body.hardStop !== undefined) {
    if (typeof body.hardStop !== "boolean") {
      return NextResponse.json({ error: "hardStop must be a boolean" }, { status: 400 })
    }
    update["hard_stop"] = body.hardStop
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { error } = await db
    .from("ai_usage_budgets")
    .upsert({ org_id: org.org_id, ...update }, { onConflict: "org_id" })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from("audit_logs").insert({
    org_id: org.org_id,
    user_id: org.userId,
    action: "ai_budget.updated",
    resource_type: "ai_usage_budget",
    resource_id: org.org_id,
    metadata: update,
  })

  return NextResponse.json({ ok: true })
}
