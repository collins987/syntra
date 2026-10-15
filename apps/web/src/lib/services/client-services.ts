import type { ClientServiceKey } from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

/**
 * The default service bundle for a brand-new personal-account client. Admin
 * can toggle any of these off from the admin panel later. Hermes defaults
 * off until Phase 7 wires the chat UI.
 */
export const DEFAULT_SERVICES: ClientServiceKey[] = [
  "website",
  "automations",
  "monitoring",
  "support",
  "reports",
  "billing",
]

/**
 * Returns the set of service keys currently active for a client. Reads with
 * the service role so the nav resolves in a single predictable query path
 * regardless of session state; RLS would also allow this for the owning
 * client, but routing it through service-role keeps every caller's cost
 * identical and lets the layout decide what to show without knowing which
 * client it is.
 */
export async function getActiveServices(
  userId: string,
): Promise<Set<ClientServiceKey>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any
  const { data } = (await db
    .from("client_services")
    .select("service")
    .eq("user_id", userId)
    .eq("active", true)) as { data: Array<{ service: ClientServiceKey }> | null }

  return new Set((data ?? []).map((row) => row.service))
}
