import { NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isPlatformAdmin } from "@/lib/auth/platform-admin"
import { createClient as createNewClient, listClients } from "@/lib/admin/clients"
import type { ClientServiceKey } from "@syntra/db"

interface CreateBody {
  full_name?: string
  email?: string
  phone?: string | null
  company_name?: string | null
  services?: ClientServiceKey[]
}

async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !isPlatformAdmin(user)) return null
  return user
}

/** GET /api/clients — admin-only, returns personal-account clients list. */
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }
  const clients = await listClients()
  return NextResponse.json({ clients })
}

/** POST /api/clients — admin-only, creates a client and sends the invite. */
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 })
  }

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 })
  }

  const email = body.email?.trim().toLowerCase() ?? ""
  const fullName = body.full_name?.trim() ?? ""

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required." }, { status: 400 })
  }
  if (!fullName) {
    return NextResponse.json({ error: "Full name is required." }, { status: 400 })
  }

  const result = await createNewClient({
    full_name: fullName,
    email,
    phone: body.phone ?? null,
    company_name: body.company_name ?? null,
    ...(body.services ? { services: body.services } : {}),
    created_by: admin.id,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Failed to create client." }, { status: 400 })
  }
  return NextResponse.json({
    ok: true,
    user_id: result.user_id,
    invite_sent: result.invite_sent ?? false,
  })
}
