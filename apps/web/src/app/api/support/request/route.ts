import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { createSupportRequest, isValidPriority } from "@/lib/support/requests"
import type { SupportPriority } from "@syntra/db"

interface Body {
  title?: string
  description?: string
  priority?: SupportPriority
  project_id?: string | null
}

/**
 * POST /api/support/request
 *
 * Client submits a new support request. project_id (optional) is validated
 * to belong to this user before we accept it, so no client can tag a
 * request against another client's project.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  let body: Body
  try {
    body = (await req.json()) as Body
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const title = body.title?.trim() ?? ""
  const description = body.description?.trim() ?? ""
  const priority = body.priority ?? "normal"

  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 })
  if (!description)
    return NextResponse.json({ error: "Description is required." }, { status: 400 })
  if (!isValidPriority(priority))
    return NextResponse.json({ error: "Invalid priority." }, { status: 400 })

  // project_id guard — must belong to this user.
  let projectId: string | null = null
  if (body.project_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svc = createServiceClient() as any
    const { data: project } = (await svc
      .from("client_projects")
      .select("id")
      .eq("id", body.project_id)
      .eq("user_id", user.id)
      .maybeSingle()) as { data: { id: string } | null }
    if (!project) {
      return NextResponse.json(
        { error: "Project not found or not yours." },
        { status: 400 },
      )
    }
    projectId = project.id
  }

  const result = await createSupportRequest({
    user_id: user.id,
    title,
    description,
    priority,
    project_id: projectId,
  })
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true, request: result.request })
}
