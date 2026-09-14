import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@syntra/ui"

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <AppShell user={{ name: (user.user_metadata?.["name"] as string | null | undefined) ?? user.email ?? null, email: user.email ?? null }}>
      {children}
    </AppShell>
  )
}
