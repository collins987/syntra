-- 010_approval_authorization.sql
-- F-03: only a client admin decides what an agent does in the business's name.
-- See F-03_APPROVAL_AUTHORIZATION_PLAN.md.
--
-- The API routes already enforce admin-only decisions, but a FOR ALL policy let
-- any member bypass them through Supabase REST — rewriting a pending approval's
-- proposed_action, granting an agent tools, or switching off the budget hard stop.
-- Members may now read these tables; only the service role (server routes that
-- check the role first) may write them.
--
-- Run after 005–009. Safe to re-run.

-- ─── ai_approvals ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "org_member_access_ai_approvals" ON ai_approvals;
DROP POLICY IF EXISTS "org_member_read_ai_approvals" ON ai_approvals;
CREATE POLICY "org_member_read_ai_approvals" ON ai_approvals
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- The decision and its outcome are separate facts: an approved action can still
-- fail to run, and the portal must not show that as if it happened.
ALTER TABLE ai_approvals
  ADD COLUMN IF NOT EXISTS executed_at      timestamptz,
  ADD COLUMN IF NOT EXISTS execution_status text
    CHECK (execution_status IN ('succeeded', 'failed')),
  ADD COLUMN IF NOT EXISTS execution_error  text;

-- ─── ai_agents ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "org_member_access_ai_agents" ON ai_agents;
DROP POLICY IF EXISTS "org_member_read_ai_agents" ON ai_agents;
CREATE POLICY "org_member_read_ai_agents" ON ai_agents
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- ─── ai_usage_budgets ─────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "org_member_access_ai_budgets" ON ai_usage_budgets;
DROP POLICY IF EXISTS "org_member_read_ai_budgets" ON ai_usage_budgets;
CREATE POLICY "org_member_read_ai_budgets" ON ai_usage_budgets
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- Expect exactly one SELECT policy per table:
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE tablename IN ('ai_approvals', 'ai_agents', 'ai_usage_budgets');

-- ─── Rollback (restores the previous, weaker policies) ───────────────────────
--
-- DROP POLICY IF EXISTS "org_member_read_ai_approvals" ON ai_approvals;
-- CREATE POLICY "org_member_access_ai_approvals" ON ai_approvals
--   FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
-- DROP POLICY IF EXISTS "org_member_read_ai_agents" ON ai_agents;
-- CREATE POLICY "org_member_access_ai_agents" ON ai_agents
--   FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
-- DROP POLICY IF EXISTS "org_member_read_ai_budgets" ON ai_usage_budgets;
-- CREATE POLICY "org_member_access_ai_budgets" ON ai_usage_budgets
--   FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
