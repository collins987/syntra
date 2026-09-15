import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"

interface Props {
  params: Promise<{ token: string }>
}

export default async function InvitePage({ params }: Props) {
  const { token } = await params

  const svc = createServiceClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = svc as any

  // Fetch invite
  const { data: invite } = (await db
    .from("team_invites")
    .select("id, org_id, email, role, expires_at, accepted_at")
    .eq("token", token)
    .maybeSingle()) as {
    data: {
      id: string
      org_id: string
      email: string
      role: string
      expires_at: string
      accepted_at: string | null
    } | null
  }

  if (!invite) {
    return <ErrorPage title="Invalid invitation" body="This invitation link is invalid or has already been used." />
  }

  if (invite.accepted_at) {
    return <ErrorPage title="Already accepted" body="This invitation has already been accepted." cta={{ href: "/portal/dashboard", label: "Go to dashboard" }} />
  }

  if (new Date(invite.expires_at) < new Date()) {
    return <ErrorPage title="Invitation expired" body="This invitation link has expired. Ask an admin to send a new one." />
  }

  // Get org name
  const { data: org } = (await db
    .from("organizations")
    .select("name")
    .eq("id", invite.org_id)
    .single()) as { data: { name: string } | null }

  // Check if user is logged in
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // Not logged in: redirect to login preserving the invite token
    redirect(`/login?redirect=/invite/${token}`)
  }

  // Wrong email address logged in
  if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
    return (
      <Shell>
        <div className="rounded-xl border border-warning-400/20 bg-warning-400/5 px-6 py-5">
          <h2 className="text-sm font-semibold text-warning-400">Wrong account</h2>
          <p className="mt-1 text-sm text-text-muted">
            This invitation was sent to <strong className="text-text-primary">{invite.email}</strong>.
            You are signed in as <strong className="text-text-primary">{user.email}</strong>.
          </p>
          <p className="mt-3 text-sm text-text-muted">
            Sign out and sign in (or sign up) with the invited address.
          </p>
          <div className="mt-4 flex gap-3">
            <a href="/login" className="rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
              Sign in with another account
            </a>
          </div>
        </div>
      </Shell>
    )
  }

  // Check already a member
  const { data: existingMember } = (await db
    .from("organization_members")
    .select("id")
    .eq("org_id", invite.org_id)
    .eq("user_id", user.id)
    .maybeSingle()) as { data: { id: string } | null }

  if (existingMember) {
    redirect("/portal/dashboard")
  }

  // Accept the invite: create membership + mark accepted
  await db.from("organization_members").insert({
    org_id: invite.org_id,
    user_id: user.id,
    role: invite.role,
  })

  await db
    .from("team_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", invite.id)

  const ROLE_LABELS: Record<string, string> = {
    CLIENT_ADMIN: "Admin",
    CLIENT_USER: "Member",
  }

  return (
    <Shell>
      <div className="rounded-xl border border-success-500/20 bg-success-500/5 px-6 py-5 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success-500/10 text-success-400 text-xl">
          ✓
        </div>
        <h2 className="text-base font-semibold text-text-primary">You&apos;re in!</h2>
        <p className="mt-1 text-sm text-text-muted">
          You&apos;ve joined <strong className="text-text-primary">{org?.name ?? "the team"}</strong> as{" "}
          <strong className="text-text-primary">{ROLE_LABELS[invite.role] ?? invite.role}</strong>.
        </p>
        <Link
          href="/portal/dashboard"
          className="mt-5 inline-flex items-center rounded-lg bg-cyan-500 px-5 py-2 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition"
        >
          Open dashboard →
        </Link>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base px-4">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-cyan-400">SYNTRA</p>
        {children}
      </div>
    </div>
  )
}

function ErrorPage({ title, body, cta }: { title: string; body: string; cta?: { href: string; label: string } }) {
  return (
    <Shell>
      <div className="rounded-xl border border-border-subtle bg-bg-elevated px-6 py-5 text-center">
        <h2 className="text-base font-semibold text-text-primary">{title}</h2>
        <p className="mt-2 text-sm text-text-muted">{body}</p>
        {cta && (
          <Link href={cta.href} className="mt-4 inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition">
            {cta.label}
          </Link>
        )}
      </div>
    </Shell>
  )
}
