-- VERIFY_MIGRATIONS.sql
-- Run this in Supabase SQL Editor to confirm every migration has been applied.
-- Every SELECT should return at least one row (or "1" for the table-exists checks).
-- A missing table or column means that migration has not been run.
--
-- Paste this whole script, click Run, and check the results panel.

-- ── Migration 005 — ai_agents ─────────────────────────────────────────────────
SELECT 'ai_agents' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'ai_agents';

-- ── Migration 006 — ai_governance (ai_approvals, action_log) ─────────────────
SELECT 'ai_approvals' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'ai_approvals';

SELECT 'action_log' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'action_log';

-- ── Migration 007 — credentials (org_credentials, workflow_tokens) ────────────
SELECT 'org_credentials' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'org_credentials';

SELECT 'workflow_tokens' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'workflow_tokens';

-- ── Migration 008 — automation_templates ─────────────────────────────────────
SELECT 'automation_templates' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'automation_templates';

-- ── Migration 009 — org_cost_ledger ──────────────────────────────────────────
SELECT 'org_cost_ledger' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'org_cost_ledger';

-- ── Migration 010 — approval/authorization columns on ai_approvals ────────────
SELECT 'ai_approvals.executed_at' AS migration, count(*) AS rows
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_approvals'
  AND column_name = 'executed_at';

-- ── Migration 011 — RLS hardening + unique index on workflow_executions ───────
SELECT 'workflow_executions.n8n_execution_id_unique' AS migration, count(*) AS rows
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'workflow_executions'
  AND indexname LIKE '%n8n_execution_id%';

-- ── Migration 012 — lead_intelligence_v2 columns on leads ────────────────────
SELECT 'leads.assignment_status' AS migration, count(*) AS rows
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name = 'assignment_status';

-- ── Migration 013 — ai_lead_intelligence columns ─────────────────────────────
SELECT 'leads.ai_score' AS migration, count(*) AS rows
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name = 'ai_score';

SELECT 'leads.ai_analyzed_at' AS migration, count(*) AS rows
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'leads'
  AND column_name = 'ai_analyzed_at';

-- ── Migration 014 — ai_lead_intelligence_correlation ─────────────────────────
SELECT 'ai_requests.lead_id' AS migration, count(*) AS rows
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ai_requests'
  AND column_name = 'lead_id';

-- ── Migration 015 — automation_helpers (functions + retry queue) ──────────────
SELECT 'increment_automation_monthly_count' AS migration, count(*) AS rows
FROM pg_proc
WHERE proname = 'increment_automation_monthly_count';

SELECT 'automation_retry_queue' AS migration, count(*) AS rows
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'automation_retry_queue';

-- ── Summary ───────────────────────────────────────────────────────────────────
-- Every row above should show count = 1.
-- A count of 0 means that migration has NOT been applied. Run the corresponding
-- file in packages/db/migrations/ to fix it.
