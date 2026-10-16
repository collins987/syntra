import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  createWorkflow,
  listWorkflows,
  type CreateWorkflowInput,
} from "@/lib/admin/workflows"

interface CreateBody {
  name?: string
  description?: string | null
  n8n_workflow_id?: string | null
  status?: "active" | "inactive" | "error"
  time_saved_minutes?: number
  cost_saved_usd?: number
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) return null
  return user
}

/** GET /api/admin/workflows — admin-only, returns catalogue with assignment counts. */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  const workflows = await listWorkflows()
  return NextResponse.json({ workflows })
}

/** POST /api/admin/workflows — admin-only, creates a workflow catalogue entry. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Workflow name is required." }, { status: 400 })
  }

  const input: CreateWorkflowInput = { name: body.name }
  if (body.description !== undefined) input.description = body.description
  if (body.n8n_workflow_id !== undefined) input.n8n_workflow_id = body.n8n_workflow_id
  if (body.status !== undefined) input.status = body.status
  if (body.time_saved_minutes !== undefined)
    input.time_saved_minutes = body.time_saved_minutes
  if (body.cost_saved_usd !== undefined) input.cost_saved_usd = body.cost_saved_usd

  const result = await createWorkflow(input)
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true, workflow: result.workflow })
}
