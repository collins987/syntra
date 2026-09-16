-- 005_ai_agents.sql
-- Per-org agent instances. Autonomy is a number the policy engine enforces on
-- every action — not a description. See SYNTRA_BUILD_PLAN.md §3 Decision C.

CREATE TABLE IF NOT EXISTS ai_agents (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_key        text NOT NULL CHECK (agent_key IN ('ava', 'max', 'leo')),
  display_name     text NOT NULL,

  -- 0 manual · 1 assisted · 2 automated · 3 autonomous · 4 proactive
  -- Every agent starts at 1 for a new org. No exceptions.
  autonomy_level   int  NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 4),

  status           text NOT NULL DEFAULT 'active'
                     CHECK (status IN ('active', 'paused', 'disabled')),

  -- Injected into the system prompt: industry, plan, active automations, etc.
  business_context jsonb NOT NULL DEFAULT '{}',

  -- Deny by default. A capability absent from this list is refused.
  granted_tools    text[] NOT NULL DEFAULT '{}',

  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, agent_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_agents_org ON ai_agents(org_id);

ALTER TABLE ai_agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_access_ai_agents" ON ai_agents;
CREATE POLICY "org_member_access_ai_agents" ON ai_agents
  FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));

DROP TRIGGER IF EXISTS set_updated_at ON ai_agents;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON ai_agents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
