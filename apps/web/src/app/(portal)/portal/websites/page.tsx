import type { Metadata } from "next"
import type { Website } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Globe, ExternalLink, Clock } from "lucide-react"

export const metadata: Metadata = { title: "Websites" }

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  live: {
    label: "Live",
    dot: "bg-success-400",
    badge: "bg-success-500/10 text-success-400 border-success-500/20",
  },
  deploying: {
    label: "Deploying",
    dot: "bg-cyan-400 animate-pulse",
    badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  },
  onboarding: {
    label: "In setup",
    dot: "bg-warning-400",
    badge: "bg-warning-400/10 text-warning-400 border-warning-400/20",
  },
  paused: {
    label: "Paused",
    dot: "bg-border-strong",
    badge: "bg-border-strong/30 text-text-muted border-border-subtle",
  },
}

const DEFAULT_STATUS = {
  label: "Unknown",
  dot: "bg-border-strong",
  badge: "bg-border-strong/30 text-text-muted border-border-subtle",
}

export default async function WebsitesPage() {
  const org = await getUserOrg()
  const supabase = await createClient()

  let websites: Website[] = []
  if (org) {
    const { data } = await supabase
      .from("websites")
      .select("*")
      .eq("org_id", org.org_id)
      .order("created_at", { ascending: false })
    websites = data ?? []
  }

  return (
    <div className="animate-fade-in flex h-full flex-col">
      <div className="shrink-0 border-b border-border-subtle px-8 py-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-text-primary">Websites</h1>
            <p className="mt-1 text-sm text-text-muted">
              {websites.length} site{websites.length !== 1 ? "s" : ""} managed by SYNTRA
            </p>
          </div>
          <button className="flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors">
            <Globe className="h-3.5 w-3.5" />
            New website
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {websites.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {websites.map((site) => {
              const cfg = STATUS_CONFIG[site.status] ?? DEFAULT_STATUS
              const displayUrl = site.live_url ?? site.preview_url ?? site.domain
              return (
                <div
                  key={site.id}
                  className="flex flex-col rounded-xl border border-border-subtle bg-bg-elevated p-5 transition-all hover:border-border"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-surface">
                      <Globe className="h-4 w-4 text-text-muted" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-text-primary">
                        {site.domain ?? "Pending domain"}
                      </p>
                      {site.cloudflare_pages_project && (
                        <p className="mt-0.5 font-mono text-[11px] text-text-disabled truncate">
                          {site.cloudflare_pages_project}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                    <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="mt-auto flex items-center justify-between border-t border-border-subtle/40 pt-3">
                    <div className="flex items-center gap-1.5 text-[11px] text-text-disabled">
                      <Clock className="h-3 w-3" />
                      <span>{new Date(site.created_at).toLocaleDateString()}</span>
                    </div>
                    {displayUrl && (
                      <a
                        href={displayUrl.startsWith("http") ? displayUrl : `https://${displayUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-cyan-400 transition-colors hover:text-cyan-300"
                      >
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-border-subtle bg-bg-elevated">
        <Globe className="h-6 w-6 text-text-disabled" />
      </div>
      <p className="text-base font-semibold text-text-primary">No websites yet</p>
      <p className="mt-1 text-sm text-text-muted">Your AI-generated website will appear here once created.</p>
      <button className="mt-6 flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors">
        <Globe className="h-3.5 w-3.5" />
        Create website
      </button>
    </div>
  )
}
