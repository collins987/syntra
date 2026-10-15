import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getAccountContext } from "@/lib/suite/account"
import { SettingsClient } from "./_components/settings-client"
import { ProfileSettings } from "./_components/profile-settings"

export const metadata: Metadata = { title: "Settings" }

export default async function SettingsPage() {
  // Personal-account users see their profile editor; org users keep the
  // existing team-management screen below.
  const account = await getAccountContext()
  if (account.kind === "personal") {
    return <ProfileSettings profile={account.profile} />
  }
  if (account.kind !== "org") {
    redirect("/login")
  }
  const org = { org_id: account.org_id, role: account.org_role }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const svc = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = svc as any

  const [orgRes, membersRes, invitesRes] = await Promise.all([
    db
      .from("organizations")
      .select("id, name, slug, plan")
      .eq("id", org.org_id)
      .single(),
    db
      .from("organization_members")
      .select("id, user_id, role, created_at")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: true }),
    db
      .from("team_invites")
      .select("id, email, role, expires_at, created_at")
      .eq("org_id", org.org_id)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false }),
  ])

  const rawMembers = (
    membersRes.data as Array<{
      id: string
      user_id: string
      role: string
      created_at: string
    }> | null
  ) ?? []

  // Resolve display name + email for each member via the admin API
  const members = await Promise.all(
    rawMembers.map(async (m) => {
      const {
        data: { user: u },
      } = await svc.auth.admin.getUserById(m.user_id)
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role,
        joinedAt: m.created_at,
        name: (u?.user_metadata?.["name"] as string | null) ?? null,
        email: u?.email ?? null,
        isYou: m.user_id === user.id,
      }
    }),
  )

  return (
    <SettingsClient
      user={{
        id: user.id,
        name: (user.user_metadata?.["name"] as string | null) ?? null,
        email: user.email ?? "",
      }}
      org={orgRes.data as { id: string; name: string; slug: string; plan: string } | null}
      members={members}
      invites={
        (invitesRes.data as Array<{
          id: string
          email: string
          role: string
          expires_at: string
        }> | null) ?? []
      }
      role={org.role}
    />
  )
}
