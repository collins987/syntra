-- Phase 3 — Migration 004
-- Run in Supabase SQL Editor after 003.
--
-- Adds email_logs: a record of every transactional email SYNTRA sends.
-- Powers the "email sent" entries in /portal/activity and lets support
-- answer "did the client actually receive it?".
--
-- Writes come from server-side code using the service role key, so there is
-- no INSERT policy for regular users — only read access for org members.

CREATE TABLE IF NOT EXISTS email_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid REFERENCES organizations(id) ON DELETE SET NULL,
  to_email   TEXT NOT NULL,
  subject    TEXT NOT NULL,
  template   TEXT NOT NULL,
  resend_id  TEXT,
  status     TEXT NOT NULL DEFAULT 'sent',
  error      TEXT,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_logs_status_check
    CHECK (status IN ('sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_email_logs_org_id     ON email_logs (org_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs (created_at DESC);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org members read email logs" ON email_logs;
CREATE POLICY "org members read email logs" ON email_logs
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM organization_members WHERE user_id = auth.uid()
    )
  );
