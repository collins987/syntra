import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

import { validateInviteToken } from "@/lib/auth/invite"
import { createServiceClient } from "@/lib/supabase/service"
import { ActivateForm } from "./activate-form"

export const metadata: Metadata = { title: "Activate your SYNTRA account" }

// Invite links point here with a fresh token every time. The page itself must
// not be cached: a stale version would show "valid" to a client whose token
// has since been accepted or expired.
export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ token: string }>
}

export default async function ActivatePage({ params }: Props) {
  const { token } = await params
  const invite = await validateInviteToken(token)

  if (!invite) {
    return (
      <Shell>
        <ErrorCard
          title="Invitation unavailable"
          body="This activation link is invalid, has already been used, or has expired. Please ask us to send a fresh one — it only takes a moment."
        />
      </Shell>
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data: profile } = (await db
    .from("profiles")
    .select("full_name")
    .eq("id", invite.user_id)
    .maybeSingle()) as { data: { full_name: string } | null }

  return (
    <Shell>
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-modal">
        <div className="mb-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Activate account
          </p>
          <h2 className="text-lg font-semibold text-text-primary">
            {profile?.full_name ? `Welcome, ${profile.full_name}` : "Welcome"}
          </h2>
          <p className="text-sm text-text-muted">
            Set a password to finish activating your SYNTRA account.
          </p>
        </div>
        <ActivateForm token={token} email={invite.email} />
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,41,53,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.3)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-mark.png"
            alt="SYNTRA"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-wide text-text-primary">
              SYNTRA
            </h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}

function ErrorCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-modal text-center">
      <h2 className="text-base font-semibold text-text-primary">{title}</h2>
      <p className="mt-2 text-sm text-text-muted">{body}</p>
      <Link
        href="/"
        className="mt-5 inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
      >
        Return home
      </Link>
    </div>
  )
}
