import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// POST, not GET: signing out is a state change, and a GET route is fetchable
// by a plain link/prefetch/crawler with no user intent behind it.
export async function POST() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
