import type { Metadata } from "next"
import type { Website } from "@syntra/db"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg } from "@/lib/org"
import { Globe, ExternalLink, Clock } from "lucide-react"
import {
  PageShell, PageHeader, PageBody, EmptyState, StatusBadge, type StatusTone,
} from "@/components/portal/primitives"
import { getAccountContext } from "@/lib/suite/account"
import { PhasePlaceholder } from "@/components/suite/phase-placeholder"

export const metadata: Metadata = { title: "Websites" }

const STATUS_LABEL: Record<string, string> = {
  live: "Live",
  deploying: "Deploying",
  onboarding: "In setup",
  paused: "Paused",
}

const STATUS_TONE: Record<string, StatusTone> = {
  live: "success",
  deploying: "cyan",
  onboarding: "warning",
  paused: "neutral",
}

export default async function WebsitesPage() {
  const account = await getAccountContext()
  if (account.kind === "personal") {
    return (
      <PhasePlaceholder
        icon={Globe}
        title="Websites"
        phase="Phase 4 — Website Management"
        description="Status for every site we build and host for you, plus a one-click way to request changes."
        bullets={[
          "Live URL, last deployment date, uptime badge, current phase",
          "Change-request form that opens a support ticket for us",
          "No CMS or code access — we handle every change ourselves",
        ]}
      />
    )
  }

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
    <PageShell>
      <PageHeader
        title="Websites"
        subtitle={`${websites.length} site${websites.length !== 1 ? "s" : ""} managed by SYNTRA`}
        actions={
          <button className="flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-4 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors">
            <Globe className="h-3.5 w-3.5" />
            New website
          </button>
        }
      />

      <PageBody>
        {websites.length === 0 ? (
          <EmptyState
            icon={Globe}
            title="No websites yet"
            body="Your AI-generated website will appear here once created."
            action={
              <button className="flex h-9 items-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-bg-base hover:bg-cyan-400 transition-colors">
                <Globe className="h-3.5 w-3.5" />
                Create website
              </button>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {websites.map((site) => {
              const displayUrl = site.live_url ?? site.preview_url ?? site.domain
              return (
                <div
                  key={site.id}
                  className="flex flex-col rounded-xl border border-border-subtle bg-bg-surface p-5 transition-all hover:border-border"
                >
                  <div className="mb-4 flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-bg-elevated">
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
                  <div className="mb-4">
                    <StatusBadge tone={STATUS_TONE[site.status] ?? "neutral"} dot>
                      {STATUS_LABEL[site.status] ?? "Unknown"}
                    </StatusBadge>
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
      </PageBody>
    </PageShell>
  )
}
