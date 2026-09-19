import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkSystemHealth } from "@/lib/health"

// Backs the topbar's status pill, polled every ~60s by every open portal tab.
// Session-gated rather than public: whether n8n or the database is reachable
// is infrastructure detail, not something to hand to an unauthenticated
// caller for free. GET only — this never writes anything.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const health = await checkSystemHealth()
  return NextResponse.json(health)
}
