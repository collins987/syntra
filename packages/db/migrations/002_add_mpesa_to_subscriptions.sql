-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds IntaSend M-Pesa columns to subscriptions table
--
-- If you already ran the old Flutterwave migration (002_add_flutterwave_to_subscriptions.sql),
-- run the RENAME block below. Otherwise run the ADD COLUMN block.
--
-- ── Option A: ran Flutterwave migration already ─────────────────────────────
-- ALTER TABLE subscriptions RENAME COLUMN flw_tx_ref TO intasend_api_ref;
-- ALTER TABLE subscriptions RENAME COLUMN flw_transaction_id TO intasend_invoice_id;
-- ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_payment_provider_check;
-- ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_payment_provider_check
--   CHECK (payment_provider IN ('stripe', 'intasend'));
-- DROP INDEX IF EXISTS idx_subscriptions_flw_tx_ref;
-- CREATE INDEX IF NOT EXISTS idx_subscriptions_intasend_api_ref
--   ON subscriptions (intasend_api_ref) WHERE intasend_api_ref IS NOT NULL;
--
-- ── Option B: fresh install (haven't run any migration yet) ──────────────────
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe', 'intasend')),
  ADD COLUMN IF NOT EXISTS intasend_api_ref TEXT,
  ADD COLUMN IF NOT EXISTS intasend_invoice_id TEXT;

CREATE INDEX IF NOT EXISTS idx_subscriptions_intasend_api_ref
  ON subscriptions (intasend_api_ref)
  WHERE intasend_api_ref IS NOT NULL;
