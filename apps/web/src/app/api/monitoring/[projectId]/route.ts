import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  getRecentChecks,
  getUptimeStats,
} from "@/lib/monitoring/checks"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/**
 * GET /api/monitoring/[projectId]
 *
 * Per-project uptime stats + the recent check history. Clients may only
 * read their own projects; the ownership check happens before any read
 * so unauthorised requests never leak the project's existence.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { projectId } = await params
  const db = createServiceClient() as AnyDb
  const { data: project } = (await db
    .from("client_projects")
    .select("*")
    .eq("id", projectId)
    .maybeSingle()) as { data: { user_id: string } | null }

  if (!project) return NextResponse.json({ error: "Not found." }, { status: 404 })
  if (project.user_id !== user.id && !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }

  const [stats, recent] = await Promise.all([
    getUptimeStats(projectId),
    getRecentChecks(projectId, 48),
  ])
  return NextResponse.json({ stats, recent })
}
