-- SYNTRA — Initial Schema
-- Phase 1: core identity + RLS

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── ENUMS ───────────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM (
  'SUPER_ADMIN', 'ADMIN', 'STAFF', 'PROJECT_MANAGER',
  'MARKETING_MANAGER', 'CLIENT_ADMIN', 'CLIENT_USER'
);

CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused'
);

CREATE TYPE project_status AS ENUM (
  'onboarding', 'in_progress', 'review', 'approved',
  'deploying', 'live', 'paused', 'canceled'
);

CREATE TYPE automation_status AS ENUM (
  'active', 'paused', 'error', 'draft'
);

CREATE TYPE approval_status AS ENUM (
  'pending', 'approved', 'revision_requested', 'rejected'
);

CREATE TYPE lead_tier AS ENUM ('A', 'B', 'C', 'D');

-- ─── CORE IDENTITY ────────────────────────────────────────────────────────────

CREATE TABLE organizations (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  plan       text NOT NULL DEFAULT 'sites',
  settings   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE organization_members (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       user_role NOT NULL DEFAULT 'CLIENT_USER',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- ─── COMMERCIAL ───────────────────────────────────────────────────────────────

CREATE TABLE subscriptions (
  id                     uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                 uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE,
  stripe_customer_id     text,
  plan                   text NOT NULL,
  status                 subscription_status NOT NULL DEFAULT 'trialing',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at              timestamptz,
  metadata               jsonb NOT NULL DEFAULT '{}',
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE invoices (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id text UNIQUE,
  amount_cents      int NOT NULL,
  currency          text NOT NULL DEFAULT 'usd',
  status            text NOT NULL,
  pdf_url           text,
  period_start      timestamptz,
  period_end        timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ─── CLIENT WORK ──────────────────────────────────────────────────────────────

CREATE TABLE projects (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  service_type     text NOT NULL,
  status           project_status NOT NULL DEFAULT 'onboarding',
  onboarding_data  jsonb NOT NULL DEFAULT '{}',
  brand_data       jsonb NOT NULL DEFAULT '{}',
  assigned_to      uuid REFERENCES auth.users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE websites (
  id                        uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id                uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  domain                    text,
  status                    text NOT NULL DEFAULT 'generating',
  preview_url               text,
  live_url                  text,
  cloudflare_pages_project  text,
  github_repo               text,
  deployment_log            jsonb NOT NULL DEFAULT '[]',
  seo_data                  jsonb NOT NULL DEFAULT '{}',
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ─── LEADS ────────────────────────────────────────────────────────────────────

CREATE TABLE leads (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email          text NOT NULL,
  name           text,
  company        text,
  source         text,
  score          int NOT NULL DEFAULT 0,
  tier           lead_tier,
  audit_answers  jsonb NOT NULL DEFAULT '{}',
  audit_report   jsonb NOT NULL DEFAULT '{}',
  crm_id         text,
  status         text NOT NULL DEFAULT 'new',
  metadata       jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── AUTOMATION ───────────────────────────────────────────────────────────────

CREATE TABLE automations (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name             text NOT NULL,
  workflow_code    text NOT NULL,
  n8n_workflow_id  text,
  status           automation_status NOT NULL DEFAULT 'active',
  config           jsonb NOT NULL DEFAULT '{}',
  last_run_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE workflow_executions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  automation_id    uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  n8n_execution_id text,
  status           text NOT NULL,
  trigger_data     jsonb NOT NULL DEFAULT '{}',
  result_data      jsonb NOT NULL DEFAULT '{}',
  error            text,
  retry_count      int NOT NULL DEFAULT 0,
  started_at       timestamptz NOT NULL DEFAULT now(),
  finished_at      timestamptz,
  duration_ms      int
);

-- ─── AI TRACKING ──────────────────────────────────────────────────────────────

CREATE TABLE ai_requests (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  function_name    text NOT NULL,
  function_version text NOT NULL DEFAULT '1.0',
  model            text NOT NULL,
  input_tokens     int NOT NULL,
  output_tokens    int NOT NULL,
  cost_usd         numeric(10,6) NOT NULL,
  duration_ms      int,
  status           text NOT NULL DEFAULT 'completed',
  error            text,
  request_id       text UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ai_usage_budgets (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id            uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  monthly_limit_usd numeric(10,2) NOT NULL DEFAULT 50.00,
  current_spend_usd numeric(10,2) NOT NULL DEFAULT 0.00,
  alert_at_percent  int NOT NULL DEFAULT 80,
  last_reset_at     timestamptz NOT NULL DEFAULT now()
);

-- ─── SUPPORT ──────────────────────────────────────────────────────────────────

CREATE TABLE support_tickets (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  subject    text NOT NULL,
  status     text NOT NULL DEFAULT 'open',
  priority   text NOT NULL DEFAULT 'normal',
  messages   jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─── PLATFORM ─────────────────────────────────────────────────────────────────

CREATE TABLE integrations (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id                uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider              text NOT NULL,
  credentials_encrypted text,
  status                text NOT NULL DEFAULT 'active',
  scopes                text[],
  metadata              jsonb NOT NULL DEFAULT '{}',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE(org_id, provider)
);

CREATE TABLE audit_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id),
  action        text NOT NULL,
  resource_type text NOT NULL,
  resource_id   text,
  metadata      jsonb NOT NULL DEFAULT '{}',
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type       text NOT NULL,
  title      text NOT NULL,
  body       text,
  read_at    timestamptz,
  metadata   jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ─── INDEXES ──────────────────────────────────────────────────────────────────

CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id  ON organization_members(org_id);
CREATE INDEX idx_projects_org_id     ON projects(org_id);
CREATE INDEX idx_leads_org_id        ON leads(org_id);
CREATE INDEX idx_leads_email         ON leads(email);
CREATE INDEX idx_automations_org_id  ON automations(org_id);
CREATE INDEX idx_wf_exec_org_id      ON workflow_executions(org_id);
CREATE INDEX idx_ai_requests_org_id  ON ai_requests(org_id);
CREATE INDEX idx_ai_requests_created ON ai_requests(created_at DESC);
CREATE INDEX idx_audit_logs_org_id   ON audit_logs(org_id);
CREATE INDEX idx_notifications_user  ON notifications(user_id, read_at);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────

-- Helper: org membership check (used in all policies)
CREATE OR REPLACE FUNCTION auth_user_org_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT org_id FROM organization_members WHERE user_id = auth.uid()
$$;

-- Apply RLS to every table
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','organization_members','subscriptions','invoices',
    'projects','websites','leads','automations','workflow_executions',
    'ai_requests','ai_usage_budgets','support_tickets','integrations',
    'audit_logs','notifications'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

-- organizations: members see their own org
CREATE POLICY "members_read_own_org" ON organizations
  FOR SELECT USING (id IN (SELECT auth_user_org_ids()));

-- organization_members: see members of your orgs
CREATE POLICY "members_read_org_members" ON organization_members
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));

-- Generic org-scoped policy for all other tables
CREATE POLICY "org_member_access_subscriptions"    ON subscriptions         FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_invoices"         ON invoices              FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_projects"         ON projects              FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_websites"         ON websites              FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_leads"            ON leads                 FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_automations"      ON automations           FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_wf_exec"          ON workflow_executions   FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_ai_requests"      ON ai_requests           FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_ai_budgets"       ON ai_usage_budgets      FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_support"          ON support_tickets       FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_integrations"     ON integrations          FOR ALL USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_audit_logs"       ON audit_logs            FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));
CREATE POLICY "org_member_access_notifications"    ON notifications         FOR ALL USING (user_id = auth.uid());

-- ─── UPDATED_AT TRIGGER ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DO $$
DECLARE tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'organizations','subscriptions','projects','websites',
    'leads','automations','support_tickets','integrations'
  ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      tbl
    );
  END LOOP;
END $$;
