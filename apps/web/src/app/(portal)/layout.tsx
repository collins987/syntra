import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { checkSystemHealth } from "@/lib/health"
import { AppShell } from "@syntra/ui"
import { NotificationsBell } from "@/components/portal/notifications-bell"

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

  const [orgRow, unread, health] = await Promise.all([
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
    // Never let a health-check hiccup break the whole portal shell — the
    // pill just starts in "Checking…" and resolves on its first client poll.
    checkSystemHealth().catch(() => null),
  ])

  return (
    <AppShell
      user={{
        name: (user.user_metadata?.["name"] as string | null | undefined) ?? user.email ?? null,
        email: user.email ?? null,
      }}
      orgName={orgRow.data?.name ?? null}
      initialHealth={health}
      notificationsSlot={<NotificationsBell initialUnreadCount={unread.count ?? 0} />}
    >
      {children}
    </AppShell>
  )
}
