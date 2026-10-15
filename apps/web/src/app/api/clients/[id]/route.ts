import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import {
  getClientDetail,
  updateClient,
  type UpdateClientInput,
} from "@/lib/admin/clients"
import type { ClientServiceKey, ProfileStatus } from "@syntra/db"

interface PatchBody {
  full_name?: string
  phone?: string | null
  company_name?: string | null
  status?: ProfileStatus
  services?: Record<ClientServiceKey, boolean>
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) return null
  return user
}

/** GET /api/clients/[id] — full client detail. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }
  const { id } = await params
  const detail = await getClientDetail(id)
  if (!detail) return NextResponse.json({ error: "Not found." }, { status: 404 })
  return NextResponse.json(detail)
}

/** PATCH /api/clients/[id] — update profile and/or services. */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  const { id } = await params
  let body: PatchBody
  try {
    body = (await req.json()) as PatchBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const update: UpdateClientInput = {}
  if (body.full_name !== undefined) update.full_name = body.full_name
  if (body.phone !== undefined) update.phone = body.phone
  if (body.company_name !== undefined) update.company_name = body.company_name
  if (body.status !== undefined) update.status = body.status
  if (body.services !== undefined) update.services = body.services

  const result = await updateClient(id, update)
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
