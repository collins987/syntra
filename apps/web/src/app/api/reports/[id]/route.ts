import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { getReport } from "@/lib/reports/data"

/** GET /api/reports/[id] — owner or admin only. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const { id } = await params
  const report = await getReport(id)
  if (!report) return NextResponse.json({ error: "Not found." }, { status: 404 })
  if (report.user_id !== user.id && !isPlatformAdmin(user)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 })
  }
  return NextResponse.json({ report })
}
