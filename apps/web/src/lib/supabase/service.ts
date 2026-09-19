import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@syntra/db"

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    // Silently falling back to the anon key here used to mean a missing env
    // var turned into confusing silent RLS failures (0-row updates/inserts on
    // every service-role write: onboarding, payment linking, the Action
    // Gateway, admin routes) instead of a clear error at the point of use.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  }
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false },
  })
}
