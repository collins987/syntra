-- 011_rls_hardening.sql
-- F-08: org members read their organisation's data; they never write it directly.
-- Every write goes through a server route that checks identity, role and ownership
-- first and then uses the service role. See SECURITY_REMEDIATION_PLAN.md §3.
--
-- Why: 0001 granted members FOR ALL on nine tables, so any logged-in member could
-- call Supabase REST and, for example, set their own subscription to an active OS
-- plan. Permissive policies are OR'd, so a stricter policy added later (003 on
-- integrations) had no effect while the FOR ALL one remained.
--
-- Run after 010. Deploy the matching application code immediately afterwards —
-- onboarding and payment linking depend on it. Safe to re-run.
--
-- Pre-check (must return no rows, or the unique index at the end will fail):
--   SELECT n8n_execution_id, count(*) FROM workflow_executions
--   WHERE n8n_execution_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;

BEGIN;

-- ─── Helpers ──────────────────────────────────────────────────────────────────

-- SECURITY DEFINER functions must pin search_path, or a caller-controlled schema
-- could shadow organization_members.
ALTER FUNCTION auth_user_org_ids() SET search_path = public, pg_temp;

CREATE OR REPLACE FUNCTION auth_user_admin_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT org_id FROM organization_members
  WHERE user_id = auth.uid() AND role = 'CLIENT_ADMIN'
$$;

REVOKE ALL ON FUNCTION auth_user_admin_org_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION auth_user_admin_org_ids() TO authenticated;

-- ─── Org data: members read, never write ─────────────────────────────────────

DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT * FROM (VALUES
      ('subscriptions',       'org_member_access_subscriptions'),
      ('invoices',            'org_member_access_invoices'),
      ('projects',            'org_member_access_projects'),
      ('websites',            'org_member_access_websites'),
      ('leads',               'org_member_access_leads'),
      ('automations',         'org_member_access_automations'),
      ('workflow_executions', 'org_member_access_wf_exec'),
      ('ai_requests',         'org_member_access_ai_requests'),
      ('support_tickets',     'org_member_access_support')
    ) AS v(tbl, old_policy)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t.old_policy, t.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_member_read_' || t.tbl, t.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()))',
      'org_member_read_' || t.tbl, t.tbl
    );
  END LOOP;
END $$;

-- ─── integrations: admins read; config can hold provider tokens ───────────────

DROP POLICY IF EXISTS "org_member_access_integrations" ON integrations;
DROP POLICY IF EXISTS "org admins manage integrations" ON integrations;
DROP POLICY IF EXISTS "org_admin_read_integrations" ON integrations;
CREATE POLICY "org_admin_read_integrations" ON integrations
  FOR SELECT USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- ─── team_invites: admins read; creating one goes through /api/team/invite ────
-- (duplicate check, email, audit). Accepting goes through the service role.

DROP POLICY IF EXISTS "org admins manage invites" ON team_invites;
DROP POLICY IF EXISTS "org_admin_read_team_invites" ON team_invites;
CREATE POLICY "org_admin_read_team_invites" ON team_invites
  FOR SELECT USING (org_id IN (SELECT auth_user_admin_org_ids()));

-- ─── notifications: read your own, mark your own as read ──────────────────────

DROP POLICY IF EXISTS "org_member_access_notifications" ON notifications;
DROP POLICY IF EXISTS "user_read_own_notifications" ON notifications;
DROP POLICY IF EXISTS "user_update_own_notifications" ON notifications;
CREATE POLICY "user_read_own_notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_update_own_notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── Internal economics: not client-visible ──────────────────────────────────
-- Cost-to-serve and margins are SYNTRA's, read only by /admin via the service role.

DROP POLICY IF EXISTS "org_member_read_cost_ledger" ON org_cost_ledger;

-- A plain view runs with its owner's privileges and ignores the caller's RLS,
-- which exposed every org's AI spend. security_invoker applies ai_requests' RLS.
ALTER VIEW org_ai_spend_by_month SET (security_invoker = true);
REVOKE ALL ON org_ai_spend_by_month FROM anon;

-- ─── n8n webhook idempotency (F-02) ──────────────────────────────────────────
-- A retried or replayed execution event must not create a second row or email.

CREATE UNIQUE INDEX IF NOT EXISTS uq_workflow_executions_n8n_execution_id
  ON workflow_executions (n8n_execution_id)
  WHERE n8n_execution_id IS NOT NULL;

COMMIT;

-- ─── Verify ───────────────────────────────────────────────────────────────────
-- No member-facing ALL/INSERT/DELETE policies should remain on org data:
--
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' AND cmd <> 'SELECT'
--   ORDER BY tablename;
--
-- Expected: only notifications / user_update_own_notifications (UPDATE).

-- ─── Rollback (restores the previous, weaker policies) ───────────────────────
-- Roll back the application code at the same time; the new routes don't depend
-- on these policies, but the old routes do.
--
-- BEGIN;
-- DO $$ DECLARE t record; BEGIN
--   FOR t IN SELECT * FROM (VALUES
--     ('subscriptions','org_member_access_subscriptions'),('invoices','org_member_access_invoices'),
--     ('projects','org_member_access_projects'),('websites','org_member_access_websites'),
--     ('leads','org_member_access_leads'),('automations','org_member_access_automations'),
--     ('workflow_executions','org_member_access_wf_exec'),('ai_requests','org_member_access_ai_requests'),
--     ('support_tickets','org_member_access_support')) AS v(tbl, old_policy)
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'org_member_read_' || t.tbl, t.tbl);
--     EXECUTE format('CREATE POLICY %I ON %I FOR ALL USING (org_id IN (SELECT auth_user_org_ids()))', t.old_policy, t.tbl);
--   END LOOP;
-- END $$;
-- DROP POLICY IF EXISTS "org_admin_read_integrations" ON integrations;
-- CREATE POLICY "org_member_access_integrations" ON integrations FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
-- DROP POLICY IF EXISTS "org_admin_read_team_invites" ON team_invites;
-- CREATE POLICY "org admins manage invites" ON team_invites FOR ALL
--   USING (org_id IN (SELECT auth_user_admin_org_ids())) WITH CHECK (org_id IN (SELECT auth_user_admin_org_ids()));
-- DROP POLICY IF EXISTS "user_read_own_notifications" ON notifications;
-- DROP POLICY IF EXISTS "user_update_own_notifications" ON notifications;
-- CREATE POLICY "org_member_access_notifications" ON notifications FOR ALL USING (user_id = auth.uid());
-- CREATE POLICY "org_member_read_cost_ledger" ON org_cost_ledger FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));
-- ALTER VIEW org_ai_spend_by_month SET (security_invoker = false);
-- DROP INDEX IF EXISTS uq_workflow_executions_n8n_execution_id;
-- COMMIT;
