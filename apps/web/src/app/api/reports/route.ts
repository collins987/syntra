import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { listReports } from "@/lib/reports/data"

/** GET /api/reports — client lists own reports. */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const reports = await listReports(user.id)
  return NextResponse.json({ reports })
}
