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
