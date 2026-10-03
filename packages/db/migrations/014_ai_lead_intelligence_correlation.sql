-- 014_ai_lead_intelligence_correlation.sql
-- Phase 1f-γ1 — correlation foundation for AI Lead Intelligence.
--
-- Adds the five columns on ai_requests that let a single operational query
-- answer "who analyzed which lead, for which org, under which model, at
-- what cost, under which trigger" without joining action_log. This is a
-- strict additive migration: no backfill, no existing-row change, every
-- new column nullable, every historical row remains valid.
--
-- Why denormalize onto ai_requests when action_log already has actor
-- information: the audit of a given AI call must survive any future
-- action_log retention policy. action_log currently has none (confirmed in
-- the Phase 1f-γ specification), but when one eventually lands, deleting
-- old action_log rows would otherwise orphan ai_requests' only correlation.
-- lead_id and actor_user_id duplicate the identity at a cost of ~16 bytes
-- per row so a reconciliation worker can read ai_requests alone.
--
-- Note on actor_user_id: no FK is set because this column may eventually
-- reference auth.users (human actors) OR workflow_tokens (workflow actors)
-- depending on trigger_source. Keeping it a free uuid matches the generic
-- "actor_ref" convention already used in action_log.
--
-- Note on trigger_source: no CHECK constraint in γ1. The application-level
-- enum is {manual, audit, crm_upsert, scheduled, agent, system_retry} but
-- enforcing that at the DB would complicate the γ3 lifecycle expansion
-- (which may add new values). Enforced by the application layer in γ1;
-- a CHECK may be added later alongside the γ3 ai_requests.status CHECK.
--
-- RLS follows the post-011 pattern: ai_requests is already SELECT-only
-- for members, writes via service-role. The new columns inherit.

ALTER TABLE ai_requests
  -- Correlates this provider interaction to the Action Gateway dispatch
  -- that caused it. ON DELETE SET NULL so action_log retention never
  -- orphans an ai_requests row.
  ADD COLUMN IF NOT EXISTS action_log_id uuid REFERENCES action_log(id) ON DELETE SET NULL,

  -- Direct correlation to the lead. Independent of action_log so audit
  -- survives any future retention sweeper on action_log.
  ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL,

  -- The initiating human admin, when applicable. NULL for system/workflow
  -- /agent actors. See the actor-identity notes above for why there's no
  -- FK: this column spans multiple identity tables depending on actor
  -- type and keeping it a free uuid matches action_log.actor_ref's shape.
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,

  -- Enum (application-level): manual | audit | crm_upsert | scheduled |
  -- agent | system_retry. Only "manual" is written by γ1 code; the rest
  -- become available in later approved phases.
  ADD COLUMN IF NOT EXISTS trigger_source text,

  -- Stable upstream event identity. "manual" for admin-click; future
  -- auto-triggers use source-specific stable IDs (e.g., audit:${lead.id}
  -- per approved Decision 5). Never random, never per-attempt.
  ADD COLUMN IF NOT EXISTS event_id text;

-- Partial indexes — populated going forward only. Historical rows stay NULL
-- and are excluded, keeping the indexes small.
CREATE INDEX IF NOT EXISTS idx_ai_requests_lead
  ON ai_requests(lead_id) WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_requests_actor
  ON ai_requests(actor_user_id) WHERE actor_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_requests_event
  ON ai_requests(event_id) WHERE event_id IS NOT NULL;

-- The action_log_id FK already creates an implicit btree internally;
-- adding an explicit named index would be redundant.

-- No RLS change: ai_requests was already SELECT-only member post-011.
-- The new columns inherit the existing policy automatically.
