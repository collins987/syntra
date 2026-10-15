import type { Metadata } from "next"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { listAllRequests } from "@/lib/support/requests"
import { QueueClient, type AdminQueueRow } from "./_components/queue-client"

export const metadata: Metadata = { title: "Admin · Support" }

export const dynamic = "force-dynamic"

export default async function AdminSupportPage() {
  await requirePlatformAdmin()
  const rows = (await listAllRequests()) as AdminQueueRow[]
  return <QueueClient initialRows={rows} />
}
