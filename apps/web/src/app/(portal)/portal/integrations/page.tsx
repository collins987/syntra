import type { Metadata } from "next"
import { getUserOrg } from "@/lib/org"
import { createServiceClient } from "@/lib/supabase/service"
import { CAPABILITY_NAMES, CAPABILITIES } from "@/lib/actions/registry"
import { NoOrg } from "@/components/portal/primitives"
import { IntegrationsClient, type ConnectionView, type TokenView } from "./_components/integrations-client"

export const metadata: Metadata = { title: "Integrations" }

export default async function IntegrationsPage() {
  const org = await getUserOrg()
  if (!org) return <NoOrg label="Integrations" />

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any

  const [credsRes, tokensRes] = await Promise.all([
    // Never selects encrypted_value — the plaintext has no client-side path.
    db
      .from("org_credentials")
      .select("provider, label, hint, status, last_used_at, created_at")
      .eq("org_id", org.org_id),
    db
      .from("workflow_tokens")
      .select("id, label, capabilities, last_used_at, created_at, revoked_at")
      .eq("org_id", org.org_id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const creds: any[] = credsRes.data ?? []

  const connections: ConnectionView[] = [
    {
      provider: "slack",
      name: "Slack",
      description:
        "Let your automations and agents post updates into a channel. Paste an incoming-webhook URL.",
      placeholder: "https://hooks.slack.com/services/…",
      connected: creds.some((c) => c.provider === "slack" && c.status === "active"),
      hint: creds.find((c) => c.provider === "slack")?.hint ?? null,
      lastUsedAt: creds.find((c) => c.provider === "slack")?.last_used_at ?? null,
    },
  ]

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tokens: TokenView[] = (tokensRes.data ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    capabilities: t.capabilities ?? [],
    lastUsedAt: t.last_used_at,
    createdAt: t.created_at,
  }))

  const capabilities = CAPABILITY_NAMES.map((name) => ({
    name,
    description: CAPABILITIES[name]?.description ?? "",
    irreversible: CAPABILITIES[name]?.irreversible ?? false,
  }))

  return (
    <IntegrationsClient
      connections={connections}
      tokens={tokens}
      capabilities={capabilities}
      isAdmin={org.role === "CLIENT_ADMIN"}
    />
  )
}
