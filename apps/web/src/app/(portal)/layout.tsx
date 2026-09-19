import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { AppShell } from "@syntra/ui"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Both are read through the user's own session, so RLS scopes them. Neither
  // is load-bearing: a user mid-onboarding has no org yet, and the header
  // simply renders without those pieces rather than failing.
  const org = await getUserOrg()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [orgRow, unread] = await Promise.all([
    org
      ? (db.from("organizations").select("name").eq("id", org.org_id).maybeSingle() as Promise<{
          data: { name: string } | null
        }>)
      : Promise.resolve({ data: null }),
    db
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null) as Promise<{ count: number | null }>,
  ])

  return (
    <AppShell
      user={{
        name: (user.user_metadata?.["name"] as string | null | undefined) ?? user.email ?? null,
        email: user.email ?? null,
      }}
      orgName={orgRow.data?.name ?? null}
      unreadCount={unread.count ?? 0}
    >
      {children}
    </AppShell>
  )
}
