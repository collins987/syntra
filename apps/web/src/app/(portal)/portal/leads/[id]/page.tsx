import type { Metadata } from "next"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getUserOrg, isOrgAdmin } from "@/lib/org"
import { ensureScoringPolicy, scoreLead } from "@/lib/leads/scoring"
import { redactLeadForPrompt } from "@/lib/leads/redact"
import { hashAnalysisInput, ANALYSIS_VERSION } from "@/lib/ai/functions/input-hash"
import {
  PageShell,
  PageHeader,
  PageBody,
  Panel,
  StatusBadge,
  timeAgo,
  type StatusTone,
} from "@/components/portal/primitives"
import { LeadScoreBadge } from "@/components/portal/lead-score-badge"
import { AiIntelligencePanel } from "@/components/portal/ai-intelligence-panel"
import type { Lead } from "@syntra/db"

export const metadata: Metadata = { title: "Lead" }

const STATUS_TONE: Record<string, StatusTone> = {
  new: "cyan",
  contacted: "warning",
  qualified: "success",
  converted: "success",
  lost: "error",
}

const SERVICE_LABELS: Record<string, string> = {
  sites: "Syntra Sites",
  flow: "Syntra Flow",
  growth: "Syntra Growth",
  os: "Syntra OS",
}

/** Lead detail — the single surface where Deterministic Qualification and
 *  AI Intelligence sit side by side as sibling panels. The two systems are
 *  rendered through separate components reading separate columns; nothing
 *  on this page composites them into a single number. See
 *  AI_LEAD_INTELLIGENCE_PLAN.md §J. */
export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const org = await getUserOrg()
  if (!org) redirect("/login")

  const supabase = await createClient()
  // Member SELECT RLS (migration 011) is the primary isolation — a user
  // from another org gets zero rows and we 404. Admin role gates the
  // Analyze action but not read access.
  const { data: lead } = (await supabase.from("leads").select("*").eq("id", id).maybeSingle()) as {
    data: Lead | null
  }
  if (!lead) notFound()

  const admin = isOrgAdmin(org.role)

  // Deterministic reasons: recompute from the same policy the engine uses,
  // same way /portal/leads list does, so nothing is cached stale.
  const policy = await ensureScoringPolicy(org.org_id)
  const { reasons } = scoreLead(
    {
      interested_service: lead.interested_service,
      source: lead.source,
      revenue: null,
      industry: null,
      created_at: lead.created_at,
      company: lead.company,
    },
    policy
  )

  // AI staleness: compare the stored input hash + version to what the
  // current lead would hash to right now. Any mismatch flags the stored
  // analysis as stale in the UI without touching the data.
  let aiStale = false
  if (lead.ai_analyzed_at && lead.ai_analysis_input_hash) {
    const redacted = redactLeadForPrompt(lead)
    const currentHash = hashAnalysisInput(redacted, ANALYSIS_VERSION)
    aiStale =
      currentHash !== lead.ai_analysis_input_hash ||
      lead.ai_analysis_version !== ANALYSIS_VERSION
  }

  return (
    <PageShell>
      <PageHeader
        title={lead.name ?? lead.email}
        subtitle={lead.email}
        actions={
          <Link
            href="/portal/leads"
            className="flex h-9 items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-4 text-sm text-text-muted hover:border-border hover:text-text-primary transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back to leads
          </Link>
        }
      />

      <PageBody>
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Deterministic Qualification"
            description="SYNTRA's policy-driven qualification. Rule-based, auditable, reproducible."
          >
            <div className="space-y-5 px-6 py-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                    Score
                  </p>
                  <p className="mt-1">
                    <LeadScoreBadge score={lead.score} tier={lead.tier} />
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
                    Status
                  </p>
                  <div className="mt-1">
                    <StatusBadge tone={STATUS_TONE[lead.status] ?? "cyan"}>
                      <span className="capitalize">{lead.status}</span>
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <ReasonList label="Reasons" items={reasons} />
            </div>
          </Panel>

          <AiIntelligencePanel
            leadId={lead.id}
            isAdmin={admin}
            initial={{
              aiScore: lead.ai_score,
              reasoning: lead.ai_reasoning,
              confidence: lead.ai_confidence,
              model: lead.ai_model,
              analyzedAt: lead.ai_analyzed_at,
              analysisVersion: lead.ai_analysis_version,
              stale: aiStale,
            }}
          />
        </div>

        <Panel title="Lead details">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 px-6 py-5 sm:grid-cols-2">
            <Detail label="Company" value={lead.company ?? "—"} />
            <Detail label="Source" value={lead.source ?? "—"} />
            <Detail
              label="Interested in"
              value={
                lead.interested_service
                  ? SERVICE_LABELS[lead.interested_service] ?? lead.interested_service
                  : "—"
              }
            />
            <Detail label="Created" value={timeAgo(lead.created_at)} />
          </dl>
        </Panel>
      </PageBody>
    </PageShell>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-text-primary">{value}</dd>
    </div>
  )
}

function ReasonList({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
        {label}
      </p>
      {items.length === 0 ? (
        <p className="mt-1 text-sm text-text-muted">No qualification evidence yet.</p>
      ) : (
        <ul className="mt-1 space-y-1 text-sm text-text-muted">
          {items.map((item, idx) => (
            <li key={idx} className="pl-2">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
