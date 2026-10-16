import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  assignWorkflowToClient,
  unassignWorkflowFromClient,
} from "@/lib/admin/workflows"

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) return null
  return user
}

/**
 * POST /api/admin/workflows/[id]/assign  { user_id }  — add assignment
 * DELETE /api/admin/workflows/[id]/assign?user_id=…  — remove assignment
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })

  const { id } = await params
  let body: { user_id?: string }
  try {
    body = (await req.json()) as { user_id?: string }
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }
  if (!body.user_id)
    return NextResponse.json({ error: "user_id is required." }, { status: 400 })

  const result = await assignWorkflowToClient({
    workflow_id: id,
    user_id: body.user_id,
  })
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin)
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })

  const { id } = await params
  const userId = new URL(req.url).searchParams.get("user_id")
  if (!userId)
    return NextResponse.json({ error: "user_id query param is required." }, { status: 400 })

  const result = await unassignWorkflowFromClient({
    workflow_id: id,
    user_id: userId,
  })
  if (!result.ok)
    return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
