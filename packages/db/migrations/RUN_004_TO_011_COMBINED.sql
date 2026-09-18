-- ══════════════════════════════════════════════════════════════════════════
-- RUN_004_TO_011_COMBINED.sql
--
-- Migrations 004 through 011, concatenated into one script for the Supabase
-- SQL Editor. Wrapped in a SINGLE transaction (one BEGIN/COMMIT at the very
-- top and bottom of this file) — so this either applies completely, or none
-- of it applies. If any statement fails, everything rolls back and your
-- database is left exactly as it was; nothing partial gets committed.
--
-- ── Before you run this ──────────────────────────────────────────────────
-- 011 alters RLS policies on `integrations` and `team_invites`, which are
-- created by migration 003 — NOT included in this file, since you asked for
-- 004 onward. Run this one-line check first:
--
--   SELECT to_regclass('public.integrations') AS integrations,
--          to_regclass('public.team_invites') AS team_invites;
--
-- If either comes back NULL, migration 003 (and probably 002) hasn't been
-- run yet — do those first, or this script will fail (safely — it will
-- roll back, not corrupt anything) partway through the 011 section.
-- If your team-invite and integrations pages already work in the live
-- portal today, 003 is already applied and you're clear to proceed.
--
-- Also recommended before running (from 011's own original pre-check):
--
--   SELECT n8n_execution_id, count(*) FROM workflow_executions
--   WHERE n8n_execution_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
--
-- This must return zero rows, or the unique index near the end of this
-- script will fail (rolling back the whole thing, same safety guarantee).
--
-- Safe to re-run: every statement uses IF NOT EXISTS / IF EXISTS / OR
-- REPLACE, so running this twice is a no-op the second time.
-- ══════════════════════════════════════════════════════════════════════════

BEGIN;

-- ══════════════════════════════════════════════════════════════════════════
-- 004_email_logs.sql
-- ══════════════════════════════════════════════════════════════════════════

-- Phase 3 — Migration 004
-- Run in Supabase SQL Editor after 003.
--
-- Adds email_logs: a record of every transactional email SYNTRA sends.
-- Powers the "email sent" entries in /portal/activity and lets support
-- answer "did the client actually receive it?".
--
-- Writes come from server-side code using the service role key, so there is
-- no INSERT policy for regular users — only read access for org members.

CREATE TABLE IF NOT EXISTS email_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES organizations(id) ON DELETE SET NULL,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  template   TEXT NOT NULL,
  resend_id  TEXT,
  status     TEXT NOT NULL DEFAULT 'sent',
  error      TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_logs_status_check
    CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_org_id     ON email_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read email logs" ON email_logs;
CREATE POLICY "org members read email logs" ON email_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════════════════════
-- 005_ai_agents.sql
-- ══════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════
-- 006_ai_governance.sql
-- ══════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════
-- 007_credentials.sql
-- ══════════════════════════════════════════════════════════════════════════

-- 007_credentials.sql
-- SYNTRA holds every client credential; n8n holds exactly one workflow token.
-- See SYNTRA_BUILD_PLAN.md §3 Decision A — this is what makes SYNTRA's authority
-- structural rather than advisory.

-- ─── Client credentials ───────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. RLS is enabled with no permissive policy, so anon and
-- authenticated roles are denied outright. There is no client-side read path.

CREATE TABLE IF NOT EXISTS org_credentials (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  label           text NOT NULL,

  -- AES-256-GCM ciphertext produced by lib/crypto.ts. Never a plaintext secret.
  encrypted_value text NOT NULL,
  -- Last 4 chars of the plaintext, for "which key is this?" without decrypting.
  hint            text,

  scopes          text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'revoked', 'expired')),
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, provider, label)
);

CREATE INDEX IF NOT EXISTS idx_org_credentials_org ON org_credentials(org_id);

ALTER TABLE org_credentials ENABLE ROW LEVEL SECURITY;
-- Deliberately no policy: only the service role reaches this table.

DROP TRIGGER IF EXISTS set_updated_at ON org_credentials;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON org_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Workflow tokens ──────────────────────────────────────────────────────────
-- The only credential n8n ever holds. Scoped to one org and a capability list,
-- so a compromised n8n yields one org's narrow grant, not a credential vault.

CREATE TABLE IF NOT EXISTS workflow_tokens (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label        text NOT NULL DEFAULT 'n8n',

  -- SHA-256 of the token. The plaintext is shown once, at creation, and never stored.
  token_hash   text NOT NULL UNIQUE,
  capabilities text[] NOT NULL DEFAULT '{}',

  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tokens_hash ON workflow_tokens(token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE workflow_tokens ENABLE ROW LEVEL SECURITY;

-- Members may see that a token exists (label, last used, scopes) to manage it.
-- token_hash is never selected by application code.
DROP POLICY IF EXISTS "org_member_read_workflow_tokens" ON workflow_tokens;
CREATE POLICY "org_member_read_workflow_tokens" ON workflow_tokens
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- ══════════════════════════════════════════════════════════════════════════
-- 008_templates.sql
-- ══════════════════════════════════════════════════════════════════════════

-- 008_templates.sql
-- Reusable automation blueprints — the agency → product transition.
-- A new client becomes "template + configuration", not "build from zero".

CREATE TABLE IF NOT EXISTS automation_templates (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  category              text NOT NULL,
  description           text NOT NULL,

  -- Parameterised n8n workflow. Placeholders are filled from `variables`.
  n8n_definition        jsonb NOT NULL DEFAULT '{}',
  -- Action Gateway capabilities this template needs granted.
  required_capabilities text[] NOT NULL DEFAULT '{}',
  -- Providers the org must have connected before this can deploy.
  required_credentials  text[] NOT NULL DEFAULT '{}',
  -- [{ key, label, help, required, default }]
  variables             jsonb NOT NULL DEFAULT '[]',

  version               int  NOT NULL DEFAULT 1,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'deprecated')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_status ON automation_templates(status);

ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;

-- Templates are SYNTRA's catalogue, not org data: readable by any signed-in
-- user once published; only the service role writes them.
DROP POLICY IF EXISTS "authenticated_read_published_templates" ON automation_templates;
CREATE POLICY "authenticated_read_published_templates" ON automation_templates
  FOR SELECT TO authenticated USING (status = 'published');

DROP TRIGGER IF EXISTS set_updated_at ON automation_templates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Automation alterations ───────────────────────────────────────────────────

ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS template_id             uuid REFERENCES automation_templates(id),
  ADD COLUMN IF NOT EXISTS template_version        int,
  ADD COLUMN IF NOT EXISTS monthly_execution_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_user_id           uuid REFERENCES auth.users(id);

-- ─── Lead alterations ─────────────────────────────────────────────────────────
-- The AI score is kept separate from the deterministic one so we can compare
-- them before trusting the model.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_score     int,
  ADD COLUMN IF NOT EXISTS ai_reasoning text;

-- ─── Organization plan ────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan text;

-- ══════════════════════════════════════════════════════════════════════════
-- 009_economics.sql
-- ══════════════════════════════════════════════════════════════════════════

-- 009_economics.sql
-- Cost per customer, computed rather than guessed. This is what tells us whether
-- a $497 plan is actually profitable. See SYNTRA_BUILD_PLAN.md Stage 3.

CREATE TABLE IF NOT EXISTS org_cost_ledger (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  -- First day of the month this cost belongs to.
  period     date NOT NULL,
  category   text NOT NULL CHECK (category IN ('ai', 'infra', 'email', 'payments', 'sms')),
  amount_usd numeric(10,4) NOT NULL DEFAULT 0,
  source     text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, period, category, source)
);

CREATE INDEX IF NOT EXISTS idx_cost_ledger_org    ON org_cost_ledger(org_id, period DESC);
CREATE INDEX IF NOT EXISTS idx_cost_ledger_period ON org_cost_ledger(period DESC);

ALTER TABLE org_cost_ledger ENABLE ROW LEVEL SECURITY;

-- Members may see what their own org costs to run; only the service role writes.
DROP POLICY IF EXISTS "org_member_read_cost_ledger" ON org_cost_ledger;
CREATE POLICY "org_member_read_cost_ledger" ON org_cost_ledger
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- ─── AI budget alterations ────────────────────────────────────────────────────
-- hard_stop defaults true: refuse the request rather than silently overspend.

ALTER TABLE ai_usage_budgets
  ADD COLUMN IF NOT EXISTS hard_stop           boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS overage_allowed_usd numeric(10,2) NOT NULL DEFAULT 0;

-- ─── Monthly AI spend rollup ──────────────────────────────────────────────────
-- Fed into org_cost_ledger by the nightly job at /api/cron/costs.

CREATE OR REPLACE VIEW org_ai_spend_by_month AS
SELECT
  org_id,
  date_trunc('month', created_at)::date AS period,
  count(*)                              AS request_count,
  sum(input_tokens)                     AS input_tokens,
  sum(output_tokens)                    AS output_tokens,
  sum(cost_usd)                         AS cost_usd
FROM ai_requests
GROUP BY org_id, date_trunc('month', created_at);

-- ══════════════════════════════════════════════════════════════════════════
-- 010_approval_authorization.sql
-- ══════════════════════════════════════════════════════════════════════════

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

-- ══════════════════════════════════════════════════════════════════════════
-- 011_rls_hardening.sql
-- ══════════════════════════════════════════════════════════════════════════

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

-- Everything below this line is verification/rollback reference only — not
-- part of the transaction above, and nothing here executes automatically.

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
