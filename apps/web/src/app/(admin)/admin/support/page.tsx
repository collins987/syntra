import type { Metadata } from "next"
import { LifeBuoy } from "lucide-react"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Admin · Support" }

export default async function AdminSupportPage() {
  await requirePlatformAdmin()

  return (
    <PhasePlaceholder
      icon={LifeBuoy}
      title="Support queue"
      phase="Phase 4 — Support + Customer Service Workflow"
      description="Every open request across every client, filterable by priority and status."
      bullets={[
        "Status transitions: open → in_progress → resolved → closed",
        "Internal notes vs. client-visible responses, side by side",
        "Each transition fires an n8n workflow for the follow-up email",
        "Linked back to the client's profile and project context",
      ]}
    />
  )
}
