import { createClient } from "@/lib/supabase/server"

export interface UserOrg {
  org_id: string
  role: string
  userId: string
}

export async function getUserOrg(): Promise<UserOrg | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = (await (supabase as any)
    .from("organization_members")
    .select("org_id, role")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { org_id: string; role: string } | null }

  if (!data) return null
  return { org_id: data.org_id, role: data.role, userId: user.id }
}
