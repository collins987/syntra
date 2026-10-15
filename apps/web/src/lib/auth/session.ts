import type { User } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import type { Profile } from "@syntra/db"

/**
 * Returns the authenticated user for the current server request, or null.
 * Thin wrapper over supabase.auth.getUser() for use in Server Components and
 * route handlers — one import to reach for in Phase 1+ code.
 */
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/**
 * Returns the authenticated user plus their personal-account profile.
 *
 * The profile is read with the service role rather than the user's own session,
 * because an invite-accepted client runs through this path before any `active`
 * check — their row is still `pending` and the RLS self-select policy would
 * fire fine, but a service-role read keeps every caller's cost identical
 * regardless of status, and lets us surface a missing-profile case clearly
 * (an auth user without a profile row is a bug — surface it loudly rather
 * than silently redirecting).
 */
export async function getSessionWithProfile(): Promise<
  { user: User; profile: Profile } | null
> {
  const user = await getSessionUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data: profile } = (await db
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Profile | null }

  if (!profile) return null
  return { user, profile }
}
