import type { Metadata } from "next"
import { LifeBuoy } from "lucide-react"

import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Support" }

export default function SupportPage() {
  return (
    <PhasePlaceholder
      icon={LifeBuoy}
      title="Support"
      phase="Phase 4 — Support & Customer Service Workflow"
      description="Submit change requests, track their status, and keep the back-and-forth with us in one place."
      bullets={[
        "New request form with title, description, priority, and optional attachment",
        "A list of open, in-progress, resolved, and closed items",
        "Email confirmations and status-change updates powered by our n8n workflow",
        "A clean timeline of what happened and when, for each request",
      ]}
    />
  )
}
