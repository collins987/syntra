-- 015_automation_helpers.sql
-- Adds server-side helpers that support the production automation layer.
--
-- increment_automation_monthly_count
--   Called by the n8n webhook handler on every workflow execution (success or
--   failure). Using a function avoids a read-modify-write race: Postgres
--   atomically increments the counter even when multiple webhooks arrive at
--   the same millisecond for the same automation.
--
-- reset_monthly_execution_counts
--   Called by the nightly economics cron at midnight UTC on the 1st of each
--   month. Resets all counters so the automations portal always shows
--   "executions this month" rather than a running total since creation.

CREATE OR REPLACE FUNCTION increment_automation_monthly_count(automation_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE automations
  SET monthly_execution_count = COALESCE(monthly_execution_count, 0) + 1
  WHERE id = automation_id;
$$;

CREATE OR REPLACE FUNCTION reset_monthly_execution_counts()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE automations
  SET monthly_execution_count = 0;
$$;

-- Only the service role may call these; no client-side path should ever
-- touch execution counters directly.
REVOKE ALL ON FUNCTION increment_automation_monthly_count(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION reset_monthly_execution_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_automation_monthly_count(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_execution_counts() TO service_role;

-- ── automation_retry_queue ─────────────────────────────────────────────────
-- Dead-letter / retry scheduler for failed workflow executions.
-- The n8n webhook handler writes a row here when a failure is retriable
-- (retry_count < 3). The nightly economics cron also drains overdue rows.
--
-- retry_after: earliest time the retry may be dispatched (exponential backoff)
-- retry_count: 1-indexed attempt number (1 = first retry, 3 = final attempt)
-- dispatched_at: set when the retry was sent to n8n; null = still pending

CREATE TABLE IF NOT EXISTS automation_retry_queue (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id  uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  org_id         uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  execution_id   uuid REFERENCES workflow_executions(id) ON DELETE SET NULL,
  retry_count    int NOT NULL DEFAULT 1 CHECK (retry_count BETWEEN 1 AND 3),
  retry_after    timestamptz NOT NULL,
  dispatched_at  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_retry_queue_pending
  ON automation_retry_queue (retry_after)
  WHERE dispatched_at IS NULL;

ALTER TABLE automation_retry_queue ENABLE ROW LEVEL SECURITY;

-- Service role only — retry queue is internal infrastructure.
CREATE POLICY "service_role_all" ON automation_retry_queue
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
