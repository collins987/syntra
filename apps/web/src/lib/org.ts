import { createClient } from "@/lib/supabase/server"

export interface UserOrg {
  org_id: string
  role: string
  userId: string
}

/** The client's own administrator. Unknown roles are never admins. */
export function isOrgAdmin(role: string): boolean {
  return role === "CLIENT_ADMIN"
}

/**
 * Approving releases an action to the outside world in the business's name, so
 * only the client's own admin decides. SYNTRA staff roles deliberately do not —
 * the client owns the decision.
 */
export function canDecideApprovals(role: string): boolean {
  return isOrgAdmin(role)
}

export async function getUserOrg(): Promise<UserOrg | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Oldest membership wins. Without the limit, a user with two membership rows
  // (accepting a team invite while already in an org) gets an error rather than
  // a row, reads as "no organisation at all", and is bounced to onboarding.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()) as { data: { org_id: string; role: string } | null }

  if (!data) return null
  return { org_id: data.org_id, role: data.role, userId: user.id }
}
