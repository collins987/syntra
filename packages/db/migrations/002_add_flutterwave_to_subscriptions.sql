-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Adds Flutterwave payment columns to subscriptions table

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_provider TEXT NOT NULL DEFAULT 'stripe'
    CHECK (payment_provider IN ('stripe', 'flutterwave')),
  ADD COLUMN IF NOT EXISTS flw_tx_ref TEXT,
  ADD COLUMN IF NOT EXISTS flw_transaction_id TEXT;

-- Optional: index for webhook lookups by tx_ref
CREATE INDEX IF NOT EXISTS idx_subscriptions_flw_tx_ref
  ON subscriptions (flw_tx_ref)
  WHERE flw_tx_ref IS NOT NULL;
