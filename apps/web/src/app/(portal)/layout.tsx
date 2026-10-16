import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"
import { checkSystemHealth } from "@/lib/health"
import { AppShell } from "@syntra/ui"
import { NotificationsBell } from "@/components/portal/notifications-bell"
import {
  SubscriptionBanner,
  type SubscriptionStatus,
} from "@/components/portal/subscription-banner"
import { HermesButton } from "@/components/suite/hermes-button"
import { buildSuiteNav } from "@/lib/suite/nav"
import { getActiveServices } from "@/lib/services/client-services"
import type { Profile } from "@syntra/db"

// Statuses that need a persistent banner reminding the user to act.
const DEGRADED_STATUSES = new Set<string>(["past_due", "canceled", "paused"])

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  // Personal-account users (Phase 1 clients: profiles row + no org) see the
  // service-filtered Suite shell. Org-based users keep the existing portal
  // nav. The check runs with service role so a pending-status profile — which
  // the self-select RLS still allows — stays treated identically to active.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any
  const { data: profile } = (await svc
    .from("profiles")
    .select("full_name, company_name, status")
    .eq("id", user.id)
    .maybeSingle()) as { data: Pick<Profile, "full_name" | "company_name" | "status"> | null }

  if (profile?.status === "suspended") {
    redirect("/auth/error?reason=suspended")
  }

  const org = await getUserOrg()
  const isPersonalAccount = Boolean(profile) && !org

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const [orgRow, unread, health, subRow, activeServices] = await Promise.all([
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
    // Check subscription status for the degradation banner.
    org
      ? (db
          .from("subscriptions")
          .select("status, plan")
          .eq("org_id", org.org_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle() as Promise<{
          data: { status: string; plan: string } | null
        }>)
      : Promise.resolve({ data: null }),
    isPersonalAccount ? getActiveServices(user.id) : Promise.resolve(null),
  ])

  const subStatus = subRow.data?.status ?? null
  const degraded =
    subStatus && DEGRADED_STATUSES.has(subStatus) ? (subStatus as SubscriptionStatus) : null

  // Suite-specific derivations. For personal accounts the label slot shows
  // the client's own company (or their name when no company is set), not an
  // org name — personal accounts have no organisation.
  const suiteNav = isPersonalAccount && activeServices
    ? buildSuiteNav(activeServices)
    : undefined

  const headerLabel = isPersonalAccount
    ? profile?.company_name ?? profile?.full_name ?? null
    : orgRow.data?.name ?? null

  return (
    <AppShell
      user={{
        name:
          profile?.full_name ??
          (user.user_metadata?.["name"] as string | null | undefined) ??
          user.email ??
          null,
        email: user.email ?? null,
      }}
      orgName={headerLabel}
      initialHealth={health}
      notificationsSlot={<NotificationsBell initialUnreadCount={unread.count ?? 0} />}
      nav={suiteNav}
      floatingSlot={isPersonalAccount ? <HermesButton /> : null}
    >
      {degraded && (
        <SubscriptionBanner status={degraded} planName={subRow.data?.plan ?? null} />
      )}
      {children}
    </AppShell>
  )
}
