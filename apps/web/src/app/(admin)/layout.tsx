import type { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AdminNav } from "./_components/admin-nav"

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.user_metadata?.["is_admin"]) {
    redirect("/portal/dashboard")
  }

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <AdminNav />
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-border-subtle px-6">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-warning-400">
            Admin Console
          </span>
          <span className="text-xs text-text-disabled">{user.email}</span>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
