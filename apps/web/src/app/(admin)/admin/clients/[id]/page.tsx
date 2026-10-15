import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { requirePlatformAdmin } from "@/lib/auth/platform-admin"
import { getClientDetail } from "@/lib/admin/clients"
import { DetailClient } from "./_components/detail-client"

export const metadata: Metadata = { title: "Admin · Client detail" }

export const dynamic = "force-dynamic"

interface Props {
  params: Promise<{ id: string }>
}

export default async function AdminClientDetailPage({ params }: Props) {
  await requirePlatformAdmin()
  const { id } = await params
  const detail = await getClientDetail(id)
  if (!detail) notFound()

  return (
    <DetailClient
      profile={detail.profile}
      services={detail.services}
      projects={detail.projects}
      invite={detail.invite}
      last_sign_in_at={detail.last_sign_in_at}
    />
  )
}
