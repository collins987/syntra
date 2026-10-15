import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { updateClientProject, type UpdateProjectInput } from "@/lib/admin/projects"
import type { ClientProjectStatus, ClientProjectType } from "@syntra/db"

interface PatchBody {
  name?: string
  type?: ClientProjectType
  status?: ClientProjectStatus
  live_url?: string | null
  notes?: string | null
  mark_deployed?: boolean
}

/** PATCH /api/projects/[id] — admin updates project fields. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const { id } = await params

  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const update: UpdateProjectInput = {}
  if (body.name !== undefined) update.name = body.name
  if (body.type !== undefined) update.type = body.type
  if (body.status !== undefined) update.status = body.status
  if (body.live_url !== undefined) update.live_url = body.live_url
  if (body.notes !== undefined) update.notes = body.notes
  if (body.mark_deployed !== undefined) update.mark_deployed = body.mark_deployed

  const result = await updateClientProject(id, update)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
