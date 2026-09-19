import { createServiceClient } from "@/lib/supabase/service"
import { n8n } from "@/lib/n8n"

export interface SystemHealth {
  ok: boolean
  checks: {
    db: boolean
    n8n: boolean
    ai: boolean
  }
  checkedAt: string
}

/** Presence, not a live call — an actual chat request per health check would
 *  cost real money every time the topbar pill refreshes. */
function aiConfigured(): boolean {
  return process.env.AI_PROVIDER === "openrouter"
    ? Boolean(process.env.OPENROUTER_API_KEY)
    : Boolean(process.env.ANTHROPIC_API_KEY)
}

async function probeDb(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    const { error } = await db.from("organizations").select("id", { head: true, count: "exact" })
    return !error
  } catch {
    return false
  }
}

// A short-lived cache: every signed-in tab polls this on an interval, so
// without it, ten open tabs across a couple of users means ten n8n pings and
// ten DB round-trips every refresh cycle for information that cannot have
// changed in the last few seconds.
const CACHE_TTL_MS = 20_000
let cached: { at: number; value: SystemHealth } | null = null

export async function checkSystemHealth(): Promise<SystemHealth> {
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return cached.value
  }

  // n8n.ping() already swallows its own errors (missing config, cold VM,
  // network failure) and resolves false — nothing further to catch here.
  const [db, n8nOk] = await Promise.all([probeDb(), n8n.ping()])
  const ai = aiConfigured()

  const value: SystemHealth = {
    ok: db && n8nOk && ai,
    checks: { db, n8n: n8nOk, ai },
    checkedAt: new Date().toISOString(),
  }
  cached = { at: Date.now(), value }
  return value
}
