-- 013_ai_lead_intelligence.sql
-- AI Lead Intelligence — Phase 1a (database foundation).
--
-- Adds the metadata columns needed to persist, audit, cache and version AI
-- analyses on `leads`. Deterministic Lead Intelligence (score/tier/reasons) is
-- not touched and never will be — the two systems share a table but not a
-- column, and this migration encodes that separation.
--
-- `ai_score` and `ai_reasoning` themselves already exist (added by migration
-- 008 as reserved-for-future columns); this migration only adds the audit
-- trail around them. See AI_LEAD_INTELLIGENCE_PLAN.md for the full design.
--
-- RLS follows the post-011 pattern directly — `leads` is already SELECT-only
-- for members, writes go through service-role API routes (the new
-- `ai.analyze_lead` Action Gateway capability in Phase 1c), so no policy
-- change is needed on `leads`.

-- ── leads: AI analysis audit/cache/version columns ─────────────────────────
-- All nullable, all additive — zero impact on existing rows, no backfill
-- required. Named with the `ai_` prefix so they visually cluster with the
-- existing `ai_score`/`ai_reasoning` columns and will never be mistaken for
-- deterministic scoring metadata.
ALTER TABLE leads
  -- When the most recent AI analysis finished writing. NULL = never analyzed.
  -- Drives the UI's "last analyzed Xd ago" + staleness banner. Only ever
  -- written by `lib/ai/functions/analyze-lead.ts`.
  ADD COLUMN IF NOT EXISTS ai_analyzed_at timestamptz,

  -- Resolved model id for the analysis, e.g. "claude-haiku-4-5-20251001".
  -- Captured so a change in the operator-level default model becomes visible
  -- per-lead instead of silent.
  ADD COLUMN IF NOT EXISTS ai_model text,

  -- "prompt-v{N}+schema-v{M}". Participates in the cache input hash so a
  -- prompt or schema bump invalidates every existing analysis as "stale" in
  -- the UI without a destructive wipe of the stored reasoning text.
  ADD COLUMN IF NOT EXISTS ai_analysis_version text,

  -- SHA-256 (hex) of the normalized signal projection + ai_analysis_version.
  -- Cache check: if the current projection hashes to this value, skip the
  -- model call entirely.
  ADD COLUMN IF NOT EXISTS ai_analysis_input_hash text,

  -- Mirrored from the parsed CONFIDENCE block of ai_reasoning so the leads
  -- table can show a confidence dot without parsing text on every render,
  -- and so admins can filter "show me low-confidence AI analyses to review"
  -- without JSONB. If/when ai_reasoning migrates to JSONB (future), this
  -- column can be dropped.
  ADD COLUMN IF NOT EXISTS ai_confidence text
    CHECK (ai_confidence IN ('low', 'medium', 'high'));

-- Partial index: "most recently analyzed in this org" dashboards and the
-- staleness-sorted lead list. Partial so it stays tiny while most rows have
-- never been analyzed.
CREATE INDEX IF NOT EXISTS idx_leads_ai_analyzed_at
  ON leads(org_id, ai_analyzed_at DESC)
  WHERE ai_analyzed_at IS NOT NULL;

-- No RLS change needed on `leads` itself — already SELECT-only for members
-- since 011; these are just new nullable columns on an existing, already-
-- correctly-scoped table. Writes continue to go through service-role via the
-- new ai.analyze_lead Action Gateway capability (Phase 1c).
