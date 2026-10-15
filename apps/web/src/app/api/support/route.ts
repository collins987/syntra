import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { listAllRequests, listClientRequests } from "@/lib/support/requests"

/**
 * GET /api/support
 *
 * Returns the signed-in client's own requests, or — if the signed-in user
 * is a platform admin — every request across every client. Status/priority
 * filters apply only to the admin view (clients always see their full list).
 */
export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 })

  if (isPlatformAdmin(user)) {
    const url = new URL(req.url)
    const status = url.searchParams.get("status") ?? undefined
    const priority = url.searchParams.get("priority") ?? undefined
    const requests = await listAllRequests({
      ...(status ? { status: status as "open" | "in_progress" | "resolved" | "closed" } : {}),
      ...(priority ? { priority: priority as "low" | "normal" | "high" | "urgent" } : {}),
    })
    return NextResponse.json({ requests })
  }

  const requests = await listClientRequests(user.id)
  return NextResponse.json({ requests })
}
