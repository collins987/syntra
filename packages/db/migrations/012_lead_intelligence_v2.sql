-- 012_lead_intelligence_v2.sql
-- Lead Intelligence v2: deterministic scoring policy, manual assignment,
-- minimal campaign tracking. See LEAD_INTELLIGENCE_V2_PLAN.md for the full
-- design (scoring table, routing model, campaign model, and the hard
-- separation between deterministic score/tier and the future ai_score/
-- ai_reasoning fields — this migration touches only the deterministic side).
--
-- RLS follows the post-011 pattern directly (SELECT-only for members, writes
-- via service-role API routes) rather than starting permissive and hardening
-- later — no reason to repeat that history for new tables.

-- ── lead_scoring_policies ───────────────────────────────────────────────────
-- Generic rule shape so the actual scoring weights are data, not code. The
-- approved initial policy is seeded by the app (lib/leads/scoring.ts,
-- ensureScoringPolicy) the first time a given org needs one — same lazy
-- per-org pattern already used for ai_agents (ensureAgents) — not backfilled
-- here, so this migration never has to guess at every existing org's rows.
CREATE TABLE IF NOT EXISTS lead_scoring_policies (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  field       text NOT NULL CHECK (field IN
                ('interested_service', 'source', 'revenue', 'industry', 'recency', 'company')),
  operator    text NOT NULL CHECK (operator IN ('equals', 'in', 'range', 'not_null')),
  value       jsonb NOT NULL,
  points      int  NOT NULL,
  category    text NOT NULL CHECK (category IN ('intent', 'qualification', 'engagement', 'completeness')),
  explanation text NOT NULL,
  enabled     boolean NOT NULL DEFAULT true,

  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scoring_policies_org ON lead_scoring_policies(org_id);

-- Concurrency guard for ensureScoringPolicy's lazy seed: without this, two
-- simultaneous first-use calls for the same new org (e.g. a crm.upsert and an
-- audit submission landing at the same moment) can both see zero existing
-- rows and both insert the full approved policy, doubling every rule. The
-- app now upserts with ON CONFLICT against this exact key and ignores
-- duplicates, but the index is what actually makes that safe at the DB level.
CREATE UNIQUE INDEX IF NOT EXISTS uq_lead_scoring_policies_org_rule
  ON lead_scoring_policies(org_id, field, operator, value);

ALTER TABLE lead_scoring_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_read_lead_scoring_policies" ON lead_scoring_policies;
CREATE POLICY "member_read_lead_scoring_policies" ON lead_scoring_policies
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- ── campaigns ────────────────────────────────────────────────────────────────
-- Tracking only — a label a lead can point back to. No attribution math.
CREATE TABLE IF NOT EXISTS campaigns (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name       text NOT NULL,
  channel    text,
  status     text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  starts_at  date,
  ends_at    date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_org ON campaigns(org_id);

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "member_read_campaigns" ON campaigns;
CREATE POLICY "member_read_campaigns" ON campaigns
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

DROP TRIGGER IF EXISTS set_updated_at ON campaigns;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── leads: assignment + campaign + interested_service ──────────────────────
-- All nullable, all additive — zero impact on existing rows, no backfill
-- required. assigned_to intentionally references auth.users directly (any
-- org member, not a new identity system) and is validated against the lead's
-- own org at the API layer, same discipline as every other cross-table
-- reference in this schema.
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_status  text NOT NULL DEFAULT 'unassigned'
                             CHECK (assignment_status IN ('unassigned', 'assigned', 'in_progress')),
  ADD COLUMN IF NOT EXISTS campaign_id        uuid REFERENCES campaigns(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS interested_service text
                             CHECK (interested_service IN ('sites', 'flow', 'growth', 'os'));

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id) WHERE campaign_id IS NOT NULL;

-- No RLS change needed on `leads` itself — already SELECT-only for members
-- since 011; these are just new nullable columns on an existing, already-
-- correctly-scoped table.
