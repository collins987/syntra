import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"
import { sendEmail, APP_URL } from "@/lib/resend"
import { TeamInviteEmail } from "@/emails/team-invite"

export async function POST(req: NextRequest) {
  try {
    const { email, role } = (await req.json()) as { email?: string; role?: string }

    if (!email?.trim() || !role) {
      return NextResponse.json({ error: "Email and role are required" }, { status: 400 })
    }
    if (!["CLIENT_ADMIN", "CLIENT_USER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const org = await getUserOrg()
    if (!org || org.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Only admins can send invitations" }, { status: 403 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const svc = createServiceClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = svc as any
    const normalEmail = email.trim().toLowerCase()

    // Reject duplicate pending invite
    const { data: existing } = (await db
      .from("team_invites")
      .select("id")
      .eq("org_id", org.org_id)
      .eq("email", normalEmail)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle()) as { data: { id: string } | null }

    if (existing) {
      return NextResponse.json(
        { error: "A pending invitation already exists for this email." },
        { status: 409 },
      )
    }

    const { data: orgData } = (await db
      .from("organizations")
      .select("name")
      .eq("id", org.org_id)
      .single()) as { data: { name: string } | null }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: invite, error: inviteError } = (await db
      .from("team_invites")
      .insert({
        org_id: org.org_id,
        email: normalEmail,
        role,
        token,
        invited_by: user.id,
        expires_at: expiresAt,
      })
      .select("id, email, role, expires_at, created_at")
      .single()) as { data: Record<string, unknown> | null; error: Error | null }

    if (inviteError || !invite) throw inviteError ?? new Error("Failed to create invite")

    const inviterName =
      (user.user_metadata?.["name"] as string | null) ?? user.email ?? "A team member"

    await sendEmail({
      to: normalEmail,
      subject: `You're invited to join ${orgData?.name ?? "an organization"} on SYNTRA`,
      template: "team-invite",
      orgId: org.org_id,
      react: TeamInviteEmail({
        orgName: orgData?.name ?? "the team",
        inviterName,
        role,
        acceptUrl: `${APP_URL}/invite/${token}`,
        expiresInDays: 7,
      }),
    })

    return NextResponse.json({ ok: true, invite })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create invitation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// Cancel a pending invite
export async function DELETE(req: NextRequest) {
  try {
    const id = new URL(req.url).searchParams.get("id")
    if (!id) return NextResponse.json({ error: "Missing invite id" }, { status: 400 })

    const org = await getUserOrg()
    if (!org || org.role !== "CLIENT_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (createServiceClient() as any)
      .from("team_invites")
      .delete()
      .eq("id", id)
      .eq("org_id", org.org_id)

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "Failed to cancel invitation" }, { status: 500 })
  }
}
