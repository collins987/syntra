import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { createClientProject } from "@/lib/admin/projects"
import type { ClientProjectStatus, ClientProjectType } from "@syntra/db"

interface CreateBody {
  user_id?: string
  name?: string
  type?: ClientProjectType
  status?: ClientProjectStatus
  live_url?: string | null
  notes?: string | null
}

/** POST /api/projects — admin creates a project for a client. */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  if (!body.user_id) {
    return NextResponse.json({ error: "user_id is required." }, { status: 400 })
  }
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Project name is required." }, { status: 400 })
  }
  if (!body.type || !["website", "automation", "both"].includes(body.type)) {
    return NextResponse.json(
      { error: "Project type must be website, automation, or both." },
      { status: 400 },
    )
  }

  const result = await createClientProject({
    user_id: body.user_id,
    name: body.name,
    type: body.type,
    ...(body.status !== undefined ? { status: body.status } : {}),
    live_url: body.live_url ?? null,
    notes: body.notes ?? null,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, project: result.project })
}
