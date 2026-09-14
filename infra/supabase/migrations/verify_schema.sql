-- SYNTRA Schema Verification Script
-- Run in Supabase SQL Editor → paste all → Run
-- Results appear in the grid: check | status | detail

SELECT
  category,
  check_name,
  CASE WHEN result > 0 THEN 'PASS ✓' ELSE 'FAIL ✗' END AS status,
  detail
FROM (

  -- ── EXTENSIONS ────────────────────────────────────────────────────────────
  SELECT '1. Extensions' AS category, 'uuid-ossp installed' AS check_name,
    (SELECT count(*)::int FROM pg_extension WHERE extname = 'uuid-ossp') AS result,
    'Required for gen_random_uuid()' AS detail

  UNION ALL

  -- ── ENUMS ─────────────────────────────────────────────────────────────────
  SELECT '2. Enums', 'user_role',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'user_role'), 'SUPER_ADMIN, ADMIN, STAFF ...'

  UNION ALL SELECT '2. Enums', 'subscription_status',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'subscription_status'), 'trialing, active, past_due ...'

  UNION ALL SELECT '2. Enums', 'project_status',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'project_status'), 'onboarding, in_progress, live ...'

  UNION ALL SELECT '2. Enums', 'automation_status',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'automation_status'), 'active, paused, error, draft'

  UNION ALL SELECT '2. Enums', 'approval_status',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'approval_status'), 'pending, approved, rejected ...'

  UNION ALL SELECT '2. Enums', 'lead_tier',
    (SELECT count(*)::int FROM pg_type WHERE typname = 'lead_tier'), 'A, B, C, D'

  -- ── TABLES ────────────────────────────────────────────────────────────────
  UNION ALL SELECT '3. Tables', 'organizations',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='organizations'), ''

  UNION ALL SELECT '3. Tables', 'organization_members',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='organization_members'), ''

  UNION ALL SELECT '3. Tables', 'subscriptions',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='subscriptions'), ''

  UNION ALL SELECT '3. Tables', 'invoices',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='invoices'), ''

  UNION ALL SELECT '3. Tables', 'projects',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='projects'), ''

  UNION ALL SELECT '3. Tables', 'websites',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='websites'), ''

  UNION ALL SELECT '3. Tables', 'leads',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='leads'), ''

  UNION ALL SELECT '3. Tables', 'automations',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='automations'), ''

  UNION ALL SELECT '3. Tables', 'workflow_executions',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='workflow_executions'), ''

  UNION ALL SELECT '3. Tables', 'ai_requests',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_requests'), ''

  UNION ALL SELECT '3. Tables', 'ai_usage_budgets',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='ai_usage_budgets'), ''

  UNION ALL SELECT '3. Tables', 'support_tickets',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='support_tickets'), ''

  UNION ALL SELECT '3. Tables', 'integrations',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='integrations'), ''

  UNION ALL SELECT '3. Tables', 'audit_logs',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs'), ''

  UNION ALL SELECT '3. Tables', 'notifications',
    (SELECT count(*)::int FROM information_schema.tables WHERE table_schema='public' AND table_name='notifications'), ''

  -- ── KEY COLUMNS ───────────────────────────────────────────────────────────
  UNION ALL SELECT '4. Columns', 'organizations.slug is UNIQUE',
    (SELECT count(*)::int FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage cu ON tc.constraint_name = cu.constraint_name
     WHERE tc.table_name='organizations' AND cu.column_name='slug' AND tc.constraint_type='UNIQUE'), ''

  UNION ALL SELECT '4. Columns', 'organization_members.role uses user_role enum',
    (SELECT count(*)::int FROM information_schema.columns
     WHERE table_name='organization_members' AND column_name='role' AND udt_name='user_role'), ''

  UNION ALL SELECT '4. Columns', 'subscriptions.status uses subscription_status enum',
    (SELECT count(*)::int FROM information_schema.columns
     WHERE table_name='subscriptions' AND column_name='status' AND udt_name='subscription_status'), ''

  UNION ALL SELECT '4. Columns', 'projects.status uses project_status enum',
    (SELECT count(*)::int FROM information_schema.columns
     WHERE table_name='projects' AND column_name='status' AND udt_name='project_status'), ''

  UNION ALL SELECT '4. Columns', 'leads.tier uses lead_tier enum',
    (SELECT count(*)::int FROM information_schema.columns
     WHERE table_name='leads' AND column_name='tier' AND udt_name='lead_tier'), ''

  UNION ALL SELECT '4. Columns', 'ai_requests.cost_usd is numeric',
    (SELECT count(*)::int FROM information_schema.columns
     WHERE table_name='ai_requests' AND column_name='cost_usd' AND data_type='numeric'), ''

  UNION ALL SELECT '4. Columns', 'ai_usage_budgets.org_id is UNIQUE',
    (SELECT count(*)::int FROM information_schema.table_constraints tc
     JOIN information_schema.constraint_column_usage cu ON tc.constraint_name = cu.constraint_name
     WHERE tc.table_name='ai_usage_budgets' AND cu.column_name='org_id' AND tc.constraint_type='UNIQUE'), ''

  -- ── INDEXES ───────────────────────────────────────────────────────────────
  UNION ALL SELECT '5. Indexes', 'idx_org_members_user_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_org_members_user_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_org_members_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_org_members_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_projects_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_projects_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_leads_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_leads_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_leads_email',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_leads_email'), ''

  UNION ALL SELECT '5. Indexes', 'idx_automations_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_automations_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_wf_exec_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_wf_exec_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_ai_requests_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ai_requests_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_ai_requests_created',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_ai_requests_created'), ''

  UNION ALL SELECT '5. Indexes', 'idx_audit_logs_org_id',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_audit_logs_org_id'), ''

  UNION ALL SELECT '5. Indexes', 'idx_notifications_user',
    (SELECT count(*)::int FROM pg_indexes WHERE schemaname='public' AND indexname='idx_notifications_user'), ''

  -- ── ROW LEVEL SECURITY ────────────────────────────────────────────────────
  UNION ALL SELECT '6. RLS Enabled', 'organizations',
    (SELECT count(*)::int FROM pg_class WHERE relname='organizations' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'organization_members',
    (SELECT count(*)::int FROM pg_class WHERE relname='organization_members' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'subscriptions',
    (SELECT count(*)::int FROM pg_class WHERE relname='subscriptions' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'invoices',
    (SELECT count(*)::int FROM pg_class WHERE relname='invoices' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'projects',
    (SELECT count(*)::int FROM pg_class WHERE relname='projects' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'websites',
    (SELECT count(*)::int FROM pg_class WHERE relname='websites' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'leads',
    (SELECT count(*)::int FROM pg_class WHERE relname='leads' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'automations',
    (SELECT count(*)::int FROM pg_class WHERE relname='automations' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'workflow_executions',
    (SELECT count(*)::int FROM pg_class WHERE relname='workflow_executions' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'ai_requests',
    (SELECT count(*)::int FROM pg_class WHERE relname='ai_requests' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'ai_usage_budgets',
    (SELECT count(*)::int FROM pg_class WHERE relname='ai_usage_budgets' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'support_tickets',
    (SELECT count(*)::int FROM pg_class WHERE relname='support_tickets' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'integrations',
    (SELECT count(*)::int FROM pg_class WHERE relname='integrations' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'audit_logs',
    (SELECT count(*)::int FROM pg_class WHERE relname='audit_logs' AND relrowsecurity=true), ''

  UNION ALL SELECT '6. RLS Enabled', 'notifications',
    (SELECT count(*)::int FROM pg_class WHERE relname='notifications' AND relrowsecurity=true), ''

  -- ── RLS POLICIES ──────────────────────────────────────────────────────────
  UNION ALL SELECT '7. Policies', 'members_read_own_org',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='members_read_own_org'), ''

  UNION ALL SELECT '7. Policies', 'members_read_org_members',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='members_read_org_members'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_subscriptions',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_subscriptions'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_projects',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_projects'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_leads',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_leads'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_automations',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_automations'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_ai_requests',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_ai_requests'), ''

  UNION ALL SELECT '7. Policies', 'org_member_access_notifications',
    (SELECT count(*)::int FROM pg_policies WHERE policyname='org_member_access_notifications'), ''

  -- ── TRIGGERS ──────────────────────────────────────────────────────────────
  UNION ALL SELECT '8. Triggers', 'set_updated_at on organizations',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='organizations'), ''

  UNION ALL SELECT '8. Triggers', 'set_updated_at on subscriptions',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='subscriptions'), ''

  UNION ALL SELECT '8. Triggers', 'set_updated_at on projects',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='projects'), ''

  UNION ALL SELECT '8. Triggers', 'set_updated_at on websites',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='websites'), ''

  UNION ALL SELECT '8. Triggers', 'set_updated_at on leads',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='leads'), ''

  UNION ALL SELECT '8. Triggers', 'set_updated_at on automations',
    (SELECT count(*)::int FROM information_schema.triggers
     WHERE trigger_name='set_updated_at' AND event_object_table='automations'), ''

  -- ── FUNCTIONS ─────────────────────────────────────────────────────────────
  UNION ALL SELECT '9. Functions', 'auth_user_org_ids()',
    (SELECT count(*)::int FROM pg_proc WHERE proname='auth_user_org_ids'), 'RLS helper'

  UNION ALL SELECT '9. Functions', 'set_updated_at()',
    (SELECT count(*)::int FROM pg_proc WHERE proname='set_updated_at'), 'Trigger function'

) checks
ORDER BY category, check_name;
