-- Phase 5 — Migration 020
-- The automation catalogue shown read-only to clients. See SYNTRA_SDD.md §4.5
-- and SYNTRA_SDLC.md §9.
--
--   client_workflows             — one row per n8n workflow we run for clients
--   client_workflow_assignments  — which clients can see which workflows
--
-- Named with the `client_` prefix to stay consistent with migrations 017/018
-- and leave the base `workflow_executions` table (initial schema) untouched.

CREATE TABLE IF NOT EXISTS client_workflows (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  n8n_workflow_id      TEXT UNIQUE,
  name                 TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'active',
  last_run_at          timestamptz,
  time_saved_minutes   INTEGER NOT NULL DEFAULT 0,
  cost_saved_usd       NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_workflows_status_check
    CHECK (status IN ('active', 'inactive', 'error')),
  CONSTRAINT client_workflows_savings_nonneg
    CHECK (time_saved_minutes >= 0 AND cost_saved_usd >= 0)
);

CREATE INDEX IF NOT EXISTS idx_client_workflows_status
  ON client_workflows (status);

ALTER TABLE client_workflows ENABLE ROW LEVEL SECURITY;

-- Platform admin reads every row. Clients NEVER read this table directly —
-- their access flows through the join via client_workflow_assignments below.
DROP POLICY IF EXISTS "client_workflows_platform_admin_read" ON client_workflows;
CREATE POLICY "client_workflows_platform_admin_read" ON client_workflows
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- Assignment table: which clients can see which workflows. A single workflow
-- can be assigned to many clients, and one client can see many workflows.
CREATE TABLE IF NOT EXISTS client_workflow_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id   uuid NOT NULL REFERENCES client_workflows(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_workflow_assignments_unique UNIQUE (workflow_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_client_workflow_assignments_user_id
  ON client_workflow_assignments (user_id);
CREATE INDEX IF NOT EXISTS idx_client_workflow_assignments_workflow_id
  ON client_workflow_assignments (workflow_id);

ALTER TABLE client_workflow_assignments ENABLE ROW LEVEL SECURITY;

-- A client reads only their own assignments.
DROP POLICY IF EXISTS "client_workflow_assignments_self_select" ON client_workflow_assignments;
CREATE POLICY "client_workflow_assignments_self_select" ON client_workflow_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- Platform admin reads every assignment.
DROP POLICY IF EXISTS "client_workflow_assignments_platform_admin_read"
  ON client_workflow_assignments;
CREATE POLICY "client_workflow_assignments_platform_admin_read" ON client_workflow_assignments
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- The client-facing read goes through the service-role joiner in
-- lib/workflows/client.ts; keeping it there (rather than a client-side join
-- across two RLS tables) means a single predictable query path regardless
-- of how many workflows are assigned to how many clients.

-- updated_at trigger for the catalogue table
CREATE OR REPLACE FUNCTION client_workflows_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_workflows_updated_at ON client_workflows;
CREATE TRIGGER client_workflows_updated_at
  BEFORE UPDATE ON client_workflows
  FOR EACH ROW
  EXECUTE FUNCTION client_workflows_set_updated_at();
