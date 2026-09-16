import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { n8n, type N8nWorkflow } from "@/lib/n8n"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { safeEqual } from "@/lib/auth/secrets"

// Pulls workflows from n8n into the automations table.
// See SECURITY_REMEDIATION_PLAN.md §1 (F-01).
//
// Three callers, each authorised explicitly — anything else is refused:
//   GitHub Actions cron  x-cron-secret (constant-time)  → all orgs
//   Platform admin       session + app_metadata         → all orgs
//   Client admin         session + CLIENT_ADMIN         → only their org's existing rows
//
// POST only: a GET that writes can be triggered by links, prefetchers and crawlers.

type Scope = { kind: "all" } | { kind: "org"; orgId: string }

interface AutomationRow {
  id: string
  org_id: string
  n8n_workflow_id: string
}

async function authorize(req: NextRequest): Promise<Scope | NextResponse> {
  const provided = req.headers.get("x-cron-secret")

  if (provided !== null) {
    const expected = process.env.CRON_SECRET
    // Fail closed: an unset secret is an outage, never an open endpoint.
    if (!expected) {
      return NextResponse.json({ error: "Sync is not configured" }, { status: 503 })
    }
    if (!safeEqual(provided, expected)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return { kind: "all" }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (isPlatformAdmin(user)) return { kind: "all" }

  const org = await getUserOrg()
  if (org && isOrgAdmin(org.role)) return { kind: "org", orgId: org.org_id }

  return NextResponse.json(
    { error: "Only an organisation admin can sync automations" },
    { status: 403 }
  )
}

export async function POST(req: NextRequest) {
  const scope = await authorize(req)
  if (scope instanceof NextResponse) return scope

  let workflows: N8nWorkflow[]
  try {
    workflows = (await n8n.workflows()).data ?? []
  } catch (err) {
    // Stopped VM, cold start timeout or missing N8N_* config. 503 tells the
    // GitHub Action this is "unavailable", not a failure. Details stay server-side.
    console.error("[n8n-sync] n8n unavailable:", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "n8n is unavailable right now" }, { status: 503 })
  }

  if (workflows.length === 0) {
    return NextResponse.json({ synced: 0, total: 0 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  try {
    let query = db
      .from("automations")
      .select("id, org_id, n8n_workflow_id")
      .not("n8n_workflow_id", "is", null)
    if (scope.kind === "org") query = query.eq("org_id", scope.orgId)

    const { data: existing, error: readError } = (await query) as {
      data: AutomationRow[] | null
      error: Error | null
    }
    if (readError) throw readError

    const byWorkflowId = new Map((existing ?? []).map((a) => [a.n8n_workflow_id, a]))

    // New workflows are assigned to N8N_ORG_ID, and only on a global sync. A
    // client admin can refresh their own automations but never claim new ones.
    const defaultOrgId = scope.kind === "all" ? (process.env.N8N_ORG_ID ?? null) : null

    let synced = 0
    let failed = 0

    for (const wf of workflows) {
      const row = byWorkflowId.get(wf.id)
      const status = wf.active ? "active" : "paused"

      if (row) {
        const { error } = await db
          .from("automations")
          .update({ name: wf.name, status, updated_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("org_id", row.org_id)
        if (error) failed++
        else synced++
      } else if (defaultOrgId) {
        const { error } = await db.from("automations").insert({
          org_id: defaultOrgId,
          name: wf.name,
          workflow_code: `n8n-${wf.id}`,
          n8n_workflow_id: wf.id,
          status,
          config: { tags: wf.tags ?? [] },
        })
        if (error) failed++
        else synced++
      }
    }

    if (failed > 0) {
      Sentry.captureMessage(`[n8n-sync] ${failed} workflow(s) failed to sync`, "warning")
    }

    return NextResponse.json({
      synced,
      total: workflows.length,
      ...(failed > 0 ? { failed } : {}),
    })
  } catch (err) {
    Sentry.captureException(err)
    console.error("[n8n-sync]", err instanceof Error ? err.message : err)
    return NextResponse.json({ error: "Sync failed" }, { status: 500 })
  }
}
