import type { Metadata } from "next"
import { UserPlus } from "lucide-react"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Admin · Onboarding" }

export default async function AdminOnboardingPage() {
  await requirePlatformAdmin()

  return (
    <PhasePlaceholder
      icon={UserPlus}
      title="Create a client"
      phase="Phase 3 — Onboarding + Admin Panel"
      description="A single form that creates the auth user, writes the profile, assigns services, and fires the activation email."
      bullets={[
        "Collect name, email, phone, company",
        "Pick which services (Website, Automations, Monitoring, Support, Reports, Billing) are active",
        "Send the branded invite with a 30-minute magic link",
        "Mint a billing_customer record for the new client",
      ]}
    />
  )
}
