import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  deleteWorkflow,
  updateWorkflow,
  type UpdateWorkflowInput,
} from "@/lib/admin/workflows"

interface PatchBody {
  name?: string
  description?: string | null
  n8n_workflow_id?: string | null
  status?: "active" | "inactive" | "error"
  time_saved_minutes?: number
  cost_saved_usd?: number
  mark_run?: boolean
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) return null
  return user
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })

  const { id } = await params
  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const update: UpdateWorkflowInput = {}
  if (body.name !== undefined) update.name = body.name
  if (body.description !== undefined) update.description = body.description
  if (body.n8n_workflow_id !== undefined) update.n8n_workflow_id = body.n8n_workflow_id
  if (body.status !== undefined) update.status = body.status
  if (body.time_saved_minutes !== undefined)
    update.time_saved_minutes = body.time_saved_minutes
  if (body.cost_saved_usd !== undefined) update.cost_saved_usd = body.cost_saved_usd
  if (body.mark_run !== undefined) update.mark_run = body.mark_run

  const result = await updateWorkflow(id, update)
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })

  const { id } = await params
  const result = await deleteWorkflow(id)
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
