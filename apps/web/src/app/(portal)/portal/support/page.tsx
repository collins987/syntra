import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { LifeBuoy } from "lucide-react"

import { getAccountContext } from "@/lib/suite/account"
import { createServiceClient } from "@/lib/supabase/service"
import { listClientRequests } from "@/lib/support/requests"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"
import { SupportClient } from "./_components/support-client"
import type { ClientProject } from "@syntra/db"

export const metadata: Metadata = { title: "Support" }

export const dynamic = "force-dynamic"

export default async function SupportPage() {
  const account = await getAccountContext()
  if (account.kind !== "personal") {
    // Org users don't use this flow — show the placeholder so the route
    // still responds instead of 404-ing on a direct URL hit.
    if (account.kind === "anonymous") redirect("/login")
    return (
      <PhasePlaceholder
        icon={LifeBuoy}
        title="Support"
        phase="Phase 4 — Support (personal-account only)"
        description="Support requests live under personal accounts. Org-based clients use the existing team workflow."
      />
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const [requests, projectsRes] = await Promise.all([
    listClientRequests(account.user.id),
    db
      .from("client_projects")
      .select("*")
      .eq("user_id", account.user.id)
      .order("created_at", { ascending: false }),
  ])
  const projects = (projectsRes.data as ClientProject[] | null) ?? []

  return <SupportClient initialRequests={requests} projects={projects} />
}
