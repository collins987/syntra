import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { getClientWorkflows } from "@/lib/workflows/client"

/**
 * GET /api/workflows
 *
 * Returns the signed-in client's assigned workflows plus the summary totals
 * the Automations page shows at the top. Admin viewing their own account
 * sees the same shape (empty unless they've assigned workflows to themselves,
 * which they shouldn't — admins operate the system, not consume it).
 */
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  const summary = await getClientWorkflows(user.id)
  return NextResponse.json(summary)
}
