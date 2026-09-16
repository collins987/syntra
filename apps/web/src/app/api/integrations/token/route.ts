import { NextRequest, NextResponse } from "next/server"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { generateWorkflowToken } from "@/lib/crypto"
import { CAPABILITY_NAMES } from "@/lib/actions/registry"

// Mints the single credential n8n is allowed to hold: a token scoped to one org
// and an explicit capability list. The plaintext is returned once and never stored.

export async function POST(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json(
      { error: "Only an organisation admin can create workflow tokens" },
      { status: 403 }
    )
  }

  let body: { label?: string; capabilities?: string[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    body = {}
  }

  const requested = Array.isArray(body.capabilities) ? body.capabilities : []
  const capabilities = requested.filter((c) => CAPABILITY_NAMES.includes(c))
  if (requested.length > 0 && capabilities.length !== requested.length) {
    const unknown = requested.filter((c) => !CAPABILITY_NAMES.includes(c))
    return NextResponse.json(
      { error: `Unknown capabilities: ${unknown.join(", ")}` },
      { status: 400 }
    )
  }
  if (capabilities.length === 0) {
    return NextResponse.json(
      { error: "Grant at least one capability to this token" },
      { status: 400 }
    )
  }

  const { token, hash } = generateWorkflowToken()
  const label = (body.label ?? "n8n").trim() || "n8n"

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data, error } = await db
    .from("workflow_tokens")
    .insert({ org_id: org.org_id, label, token_hash: hash, capabilities })
    .select("id, label, capabilities, created_at")
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await db.from("audit_logs").insert({
    org_id: org.org_id,
    user_id: org.userId,
    action: "workflow_token.created",
    resource_type: "workflow_token",
    resource_id: data.id,
    metadata: { label, capabilities },
  })

  // The only time the plaintext is ever available.
  return NextResponse.json({ ok: true, token, tokenRecord: data })
}

export async function DELETE(req: NextRequest) {
  const org = await getUserOrg()
  if (!org) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }
  if (org.role !== "CLIENT_ADMIN") {
    return NextResponse.json({ error: "Only an organisation admin can revoke tokens" }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { error } = await db
    .from("workflow_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("org_id", org.org_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
