import type { Report } from "@syntra/db"

import { createServiceClient } from "@/lib/supabase/service"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDb = any

/** Lists one client's reports, newest first. */
export async function listReports(userId: string): Promise<Report[]> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("reports")
    .select("*")
    .eq("user_id", userId)
    .order("period_start", { ascending: false })) as { data: Report[] | null }
  return data ?? []
}

/** Reads one report. Caller enforces ownership. */
export async function getReport(id: string): Promise<Report | null> {
  const db = createServiceClient() as AnyDb
  const { data } = (await db
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle()) as { data: Report | null }
  return data
}
