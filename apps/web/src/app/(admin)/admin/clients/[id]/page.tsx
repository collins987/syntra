import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { getClientDetail } from "@/lib/admin/clients"
import {
  getClientAssignments,
  listWorkflows,
} from "@/lib/admin/workflows"
import { DetailClient } from "./_components/detail-client"
import { WorkflowAssignments } from "./_components/workflow-assignments"
import { GenerateReport } from "./_components/generate-report"

export const metadata: Metadata = { title: "Admin · Client detail" }

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: Props) {
  await requirePlatformAdmin()
  const { id } = await params
  const [detail, allWorkflows, assignedIds] = await Promise.all([
    getClientDetail(id),
    listWorkflows(),
    getClientAssignments(id),
  ])
  if (!detail) notFound()

  return (
    <>
      <DetailClient
        profile={detail.profile}
        services={detail.services}
        projects={detail.projects}
        invite={detail.invite}
        last_sign_in_at={detail.last_sign_in_at}
      />
      <div className="space-y-6 px-8 pb-8">
        <WorkflowAssignments
          userId={id}
          allWorkflows={allWorkflows}
          initialAssigned={assignedIds}
        />
        <GenerateReport userId={id} />
      </div>
    </>
  )
}
