import type { User } from "@supabase/supabase-js"
import type { Profile } from "@syntra/db"

import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/service"
import { getUserOrg } from "@/lib/org"

export interface PersonalAccountContext {
  user: User
  profile: Profile
  kind: "personal"
}

export interface OrgAccountContext {
  user: User
  profile: Profile | null
  org_id: string
  org_role: string
  kind: "org"
}

export interface AnonymousAccountContext {
  user: null
  profile: null
  kind: "anonymous"
}

export type AccountContext =
  | PersonalAccountContext
  | OrgAccountContext
  | AnonymousAccountContext

/**
 * Returns the account context for the current request:
 *   personal   — authenticated user with a profiles row and no org
 *   org        — authenticated user with an organization_members row (may
 *                also have a profile; the org routes take priority)
 *   anonymous  — no auth user (middleware will usually redirect first)
 *
 * This exists so each portal page has one call to decide how to render.
 * Server-only.
 */
export async function getAccountContext(): Promise<AccountContext> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { user: null, profile: null, kind: "anonymous" }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const svc = createServiceClient() as any
  const { data: profile } = (await svc
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle()) as { data: Profile | null }

  const org = await getUserOrg()
  if (org) {
    return {
      user,
      profile: profile ?? null,
      org_id: org.org_id,
      org_role: org.role,
      kind: "org",
    }
  }

  if (profile) {
    return { user, profile, kind: "personal" }
  }

  // Authenticated but neither org-member nor profile — same shape as
  // anonymous for callers that gate on kind !== "personal" / "org".
  return { user: null, profile: null, kind: "anonymous" }
}
