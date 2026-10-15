-- Phase 3 — Migration 018
-- client_projects: individual builds (website, automation, or both) attached
-- to a personal-account client. Distinct from the org-based `projects` table
-- from the initial schema — that one is scoped to organizations and keeps
-- running for existing clients; new clients land in here instead.
-- See SYNTRA_SDD.md §5.3 (projects) and SYNTRA_SDLC.md §7.

CREATE TABLE IF NOT EXISTS client_projects (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  type               TEXT NOT NULL,
  status             TEXT NOT NULL DEFAULT 'planning',
  live_url           TEXT,
  last_deployed_at   timestamptz,
  notes              TEXT,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_projects_type_check
    CHECK (type IN ('website', 'automation', 'both')),
  CONSTRAINT client_projects_status_check
    CHECK (status IN ('planning', 'building', 'live', 'paused'))
);

CREATE INDEX IF NOT EXISTS idx_client_projects_user_id
  ON client_projects (user_id);
CREATE INDEX IF NOT EXISTS idx_client_projects_user_status
  ON client_projects (user_id, status);

ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;

-- A client reads only their own projects. All writes come from the admin
-- panel (service role) — matches the pattern for client_services.
DROP POLICY IF EXISTS "client_projects_self_select" ON client_projects;
CREATE POLICY "client_projects_self_select" ON client_projects
  FOR SELECT
  USING (user_id = auth.uid());

-- Platform admin may read every row for the admin panel.
DROP POLICY IF EXISTS "client_projects_platform_admin_read" ON client_projects;
CREATE POLICY "client_projects_platform_admin_read" ON client_projects
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION client_projects_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_projects_updated_at ON client_projects;
CREATE TRIGGER client_projects_updated_at
  BEFORE UPDATE ON client_projects
  FOR EACH ROW
  EXECUTE FUNCTION client_projects_set_updated_at();
