import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@syntra/db"

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
