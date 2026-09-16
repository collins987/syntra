-- 006_ai_governance.sql
-- The human-in-the-loop queue and the complete record of everything SYNTRA did
-- on a client's behalf. See SYNTRA_BUILD_PLAN.md §3 Decision B.

-- ─── Approval queue ───────────────────────────────────────────────────────────
-- At autonomy Level 1, an agent proposes and a human decides here.

CREATE TABLE IF NOT EXISTS ai_approvals (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  agent_id        uuid REFERENCES ai_agents(id) ON DELETE SET NULL,
  agent_key       text NOT NULL,
  capability      text NOT NULL,

  -- The exact call that will execute verbatim on approval.
  proposed_action jsonb NOT NULL DEFAULT '{}',
  -- Plain English, shown in the portal. Written for the business owner.
  summary         text NOT NULL,

  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  decided_by      uuid REFERENCES auth.users(id),
  decided_at      timestamptz,
  decision_note   text,
  expires_at      timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_approvals_org     ON ai_approvals(org_id);
CREATE INDEX IF NOT EXISTS idx_ai_approvals_pending ON ai_approvals(org_id, status)
  WHERE status = 'pending';

ALTER TABLE ai_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_access_ai_approvals" ON ai_approvals;
CREATE POLICY "org_member_access_ai_approvals" ON ai_approvals
  FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));

-- ─── Action log ───────────────────────────────────────────────────────────────
-- Every action taken against the outside world, with no exceptions. This is an
-- audit record: org members may read it, never write it.

CREATE TABLE IF NOT EXISTS action_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor           text NOT NULL CHECK (actor IN ('agent', 'workflow', 'human', 'system')),
  actor_ref       text,
  capability      text NOT NULL,
  request         jsonb NOT NULL DEFAULT '{}',
  result          jsonb NOT NULL DEFAULT '{}',
  -- 'pending' is a reservation written before the adapter runs, so a concurrent
  -- retry collides on idempotency_key instead of double-sending.
  status          text NOT NULL CHECK (status IN ('pending', 'success', 'failed', 'blocked')),
  blocked_reason  text,

  -- Prevents a duplicate send when n8n retries a step.
  idempotency_key text UNIQUE,

  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  duration_ms     int,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_log_org     ON action_log(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_action_log_blocked ON action_log(org_id, status)
  WHERE status = 'blocked';

ALTER TABLE action_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_member_read_action_log" ON action_log;
CREATE POLICY "org_member_read_action_log" ON action_log
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- Live approval badge + activity feed in the portal.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE ai_approvals;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE action_log;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
