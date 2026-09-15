import { NextRequest, NextResponse } from "next/server"
import { n8n } from "@/lib/n8n"
import { createServiceClient } from "@/lib/supabase/service"

// Called by Vercel Cron (configured in vercel.json) or manually via POST.
// Syncs all n8n workflows into the automations table for every org that has
// N8N_ORG_ID set, or all orgs that have n8n_workflow_id rows already.
//
// Protection: CRON_SECRET header must match the env var.

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { data: workflows } = await n8n.workflows()

    if (!workflows?.length) {
      return NextResponse.json({ synced: 0, message: "No workflows found in n8n" })
    }

    const db = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const any = db as any

    // Fetch all orgs that already have automations linked to n8n
    const { data: existing } = (await any
      .from("automations")
      .select("id, org_id, n8n_workflow_id, name, status")
      .not("n8n_workflow_id", "is", null)) as {
      data: Array<{
        id: string
        org_id: string
        n8n_workflow_id: string
        name: string
        status: string
      }> | null
    }

    const existingMap = new Map(
      (existing ?? []).map((a) => [a.n8n_workflow_id, a])
    )

    // Determine the default org to assign new workflows to.
    // Uses N8N_ORG_ID env var; if not set, we skip inserting new rows and only
    // update existing ones — avoids assigning workflows to the wrong org.
    const defaultOrgId = process.env.N8N_ORG_ID ?? null

    let synced = 0
    const errors: string[] = []

    for (const wf of workflows) {
      try {
        const existing = existingMap.get(wf.id)

        if (existing) {
          // Update name and active status from n8n
          await any.from("automations").update({
            name: wf.name,
            status: wf.active ? "active" : "paused",
            updated_at: new Date().toISOString(),
          }).eq("id", existing.id)
          synced++
        } else if (defaultOrgId) {
          // Insert new automation row for this workflow
          await any.from("automations").insert({
            org_id: defaultOrgId,
            name: wf.name,
            workflow_code: `n8n-${wf.id}`,
            n8n_workflow_id: wf.id,
            status: wf.active ? "active" : "paused",
            config: { tags: wf.tags ?? [] },
          })
          synced++
        }
      } catch (err) {
        errors.push(`${wf.id}: ${err instanceof Error ? err.message : String(err)}`)
      }
    }

    return NextResponse.json({
      synced,
      total: workflows.length,
      ...(errors.length ? { errors } : {}),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Sync failed"
    console.error("[n8n-sync]", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Vercel Cron GET handler (cron jobs use GET)
export async function GET(req: NextRequest) {
  return POST(req)
}
