import type { Metadata } from "next"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { listWorkflows } from "@/lib/admin/workflows"
import { CatalogClient } from "./_components/catalog-client"

export const metadata: Metadata = { title: "Admin · Workflows" }

export const dynamic = "force-dynamic"

export default async function AdminWorkflowsPage() {
  await requirePlatformAdmin()
  const workflows = await listWorkflows()
  return <CatalogClient initialWorkflows={workflows} />
}
