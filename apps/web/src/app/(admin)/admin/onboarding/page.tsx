import type { Metadata } from "next"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { OnboardingForm } from "./_components/onboarding-form"

export const metadata: Metadata = { title: "Admin · Onboarding" }

export default async function AdminOnboardingPage() {
  await requirePlatformAdmin()

  return (
    <div className="p-8">
      <div className="mb-6 max-w-2xl">
        <h1 className="text-xl font-semibold text-text-primary">Create a client</h1>
        <p className="mt-1 text-sm text-text-muted">
          Fill in their details and pick the services they&apos;ll see in the suite.
          We&apos;ll create the account and send a one-time activation email.
        </p>
      </div>
      <div className="max-w-2xl">
        <OnboardingForm />
      </div>
    </div>
  )
}
