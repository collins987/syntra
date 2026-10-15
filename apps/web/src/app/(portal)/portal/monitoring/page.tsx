import type { Metadata } from "next"
import { Activity } from "lucide-react"

import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Monitoring" }

export default function MonitoringPage() {
  return (
    <PhasePlaceholder
      icon={Activity}
      title="Monitoring"
      phase="Phase 6 — Monitoring Dashboard"
      description="Your system health, uptime, and recent automation activity will land here."
      bullets={[
        "Uptime percentage and history for every website we host for you",
        "Recent workflow runs with status and duration",
        "The gateway action log, filtered to just your account",
        "An overall status banner so you know at a glance",
      ]}
    />
  )
}
