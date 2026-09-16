import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { encryptSecret, secretHint } from "@/lib/crypto"

// Client credentials are encrypted here and never leave the server. There is no
// read endpoint — the plaintext is only ever decrypted inside the Action Gateway.

// Route files may only export HTTP methods, so this stays module-local.
const PROVIDERS = ["slack"] as const

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json(
      { error: "Only an organisation admin can connect integrations" },
      { status: 403 }
    )
  }

  let body: { provider?: string; label?: string; value?: string }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 })
  }

  const provider = (body.provider ?? "").trim()
  const value = (body.value ?? "").trim()
  const label = (body.label ?? "default").trim() || "default"

  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return NextResponse.json({ error: `Unsupported provider "${provider}"` }, { status: 400 })
  }
  if (!value) {
    return NextResponse.json({ error: "A value is required" }, { status: 400 })
  }
  if (provider === "slack" && !value.startsWith("https://hooks.slack.com/")) {
    return NextResponse.json(
      { error: "That does not look like a Slack incoming-webhook URL" },
      { status: 400 }
    )
  }

  let encrypted: string
  try {
    encrypted = encryptSecret(value)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Encryption failed" },
      { status: 500 }
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { error } = await db.from("org_credentials").upsert(
    {
      org_id: org.org_id,
      provider,
      label,
      encrypted_value: encrypted,
      hint: secretHint(value),
      status: "active",
    },
    { onConflict: "org_id,provider,label" }
  )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from("audit_logs").insert({
    org_id: org.org_id,
    user_id: org.userId,
    action: "integration.connected",
    resource_type: "org_credential",
    resource_id: provider,
    metadata: { provider, label },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json(
      { error: "Only an organisation admin can disconnect integrations" },
      { status: 403 }
    )
  }

  const provider = req.nextUrl.searchParams.get("provider")
  if (!provider) {
    return NextResponse.json({ error: "provider is required" }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { error } = await db
    .from("org_credentials")
    .delete()
    .eq("org_id", org.org_id)
    .eq("provider", provider)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from("audit_logs").insert({
    org_id: org.org_id,
    user_id: org.userId,
    action: "integration.disconnected",
    resource_type: "org_credential",
    resource_id: provider,
    metadata: { provider },
  })

  return NextResponse.json({ ok: true })
}
