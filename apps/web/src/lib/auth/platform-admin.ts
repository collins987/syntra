import { redirect } from "next/navigation"
import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

// SYNTRA platform staff access to /admin. See SECURITY_REMEDIATION_PLAN.md §4 (F-09).
//
// The flag lives in app_metadata, which only the service role can write. It must
// never be read from user_metadata: any signed-in user can set that on themselves
// with supabase.auth.updateUser({ data: { ... } }).
//
// Grant with SQL:
//   update auth.users set raw_app_meta_data =
//     coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'
//   where email = '...';

export function isPlatformAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.["is_admin"] === true
}

/**
 * Call at the top of every /admin layout and page — authorisation belongs next to
 * the data it protects, not only in a parent layout.
 */
export async function requirePlatformAdmin(): Promise<User> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")
  if (!isPlatformAdmin(user)) redirect("/portal/dashboard")
  return user
}
