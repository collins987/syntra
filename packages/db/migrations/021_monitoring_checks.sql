-- Phase 6 — Migration 021
-- monitoring_checks: periodic HTTP health checks for each client project
-- that has a live_url. See SYNTRA_SDD.md §4.6 and SYNTRA_SDLC.md §10.
--
-- One row per check attempt. Downtime isn't a derived column — it's
-- inferred from the sequence of recent rows. Keeps the schema honest:
-- a reset check-runner can't retroactively "mark the project up"; it
-- has to post a successful check that then flows into the aggregates.

CREATE TABLE IF NOT EXISTS monitoring_checks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id        uuid NOT NULL REFERENCES client_projects(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  status            TEXT NOT NULL,
  status_code       INTEGER,
  response_time_ms  INTEGER,
  error             TEXT,
  checked_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT monitoring_checks_status_check
    CHECK (status IN ('up', 'down', 'degraded')),
  CONSTRAINT monitoring_checks_response_time_nonneg
    CHECK (response_time_ms IS NULL OR response_time_ms >= 0)
);

CREATE INDEX IF NOT EXISTS idx_monitoring_checks_project_id_checked_at
  ON monitoring_checks (project_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_project_status
  ON monitoring_checks (project_id, status, checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_checked_at
  ON monitoring_checks (checked_at DESC);

ALTER TABLE monitoring_checks ENABLE ROW LEVEL SECURITY;

-- A client reads only checks for projects they own. The join reads
-- client_projects through its own RLS (self-select), so this policy's
-- subquery is scoped to the signed-in user automatically.
DROP POLICY IF EXISTS "monitoring_checks_self_select" ON monitoring_checks;
CREATE POLICY "monitoring_checks_self_select" ON monitoring_checks
  FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM client_projects WHERE user_id = auth.uid()
    )
  );

-- Platform admin reads every check for the admin system dashboard.
DROP POLICY IF EXISTS "monitoring_checks_platform_admin_read" ON monitoring_checks;
CREATE POLICY "monitoring_checks_platform_admin_read" ON monitoring_checks
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- Writes come from the cron runner only (service role). No INSERT policy
-- is defined on purpose — if anyone finds themselves writing a check from
-- a non-service-role path, the error is the right thing to surface.
