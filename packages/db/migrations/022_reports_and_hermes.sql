-- Phase 7 — Migration 022
-- reports + hermes_usage. See SYNTRA_SDD.md §4.8/§4.10 and SYNTRA_SDLC.md §11.

-- ── reports ──────────────────────────────────────────────────────────────────
-- One per-client period summary (monthly in the default cron, but any range
-- works). The AI-generated executive copy sits in `summary`; the structured
-- metrics it was built from land in `data` so a future UI change can rebuild
-- a different presentation without re-running Claude.
CREATE TABLE IF NOT EXISTS reports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start  date NOT NULL,
  period_end    date NOT NULL,
  summary       TEXT NOT NULL,
  data          jsonb NOT NULL DEFAULT '{}'::jsonb,
  model         TEXT,
  input_tokens  INTEGER,
  output_tokens INTEGER,
  cost_usd      numeric(10,6),
  generated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT reports_period_ordered CHECK (period_end >= period_start)
);

CREATE INDEX IF NOT EXISTS idx_reports_user_period
  ON reports (user_id, period_start DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_reports_user_period
  ON reports (user_id, period_start, period_end);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reports_self_select" ON reports;
CREATE POLICY "reports_self_select" ON reports
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "reports_platform_admin_read" ON reports;
CREATE POLICY "reports_platform_admin_read" ON reports
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- ── hermes_usage ─────────────────────────────────────────────────────────────
-- Per-user monthly ledger for Hermes chat. We don't track every single call —
-- the row is upserted on each request so the budget check is a single read.
-- Month is stored as the first day of that month (UTC) so index locality lines
-- up with lookups.
CREATE TABLE IF NOT EXISTS hermes_usage (
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_start     date NOT NULL,
  request_count   INTEGER NOT NULL DEFAULT 0,
  input_tokens    INTEGER NOT NULL DEFAULT 0,
  output_tokens   INTEGER NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6) NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, month_start)
);

CREATE INDEX IF NOT EXISTS idx_hermes_usage_user
  ON hermes_usage (user_id, month_start DESC);

ALTER TABLE hermes_usage ENABLE ROW LEVEL SECURITY;

-- A client reads their own usage (for an in-UI "requests this month" line).
DROP POLICY IF EXISTS "hermes_usage_self_select" ON hermes_usage;
CREATE POLICY "hermes_usage_self_select" ON hermes_usage
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "hermes_usage_platform_admin_read" ON hermes_usage;
CREATE POLICY "hermes_usage_platform_admin_read" ON hermes_usage
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );
