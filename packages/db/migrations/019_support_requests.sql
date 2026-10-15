-- Phase 4 — Migration 019
-- support_requests: the back-and-forth between a personal-account client and
-- the admin. Each row carries both a client-visible response and an internal
-- note so the admin can keep context separate from the client-facing update.
-- See SYNTRA_SDD.md §4.7 and SYNTRA_SDLC.md §8.

CREATE TABLE IF NOT EXISTS support_requests (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id      uuid REFERENCES client_projects(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  priority        TEXT NOT NULL DEFAULT 'normal',
  status          TEXT NOT NULL DEFAULT 'open',
  -- Visible to the client. Shown on their request detail page.
  response_note   TEXT,
  -- Admin-only context — never sent to the client, never joined into their
  -- read of the row (RLS below filters SELECTs to the client's own rows but
  -- doesn't blank columns, so keeping sensitive admin context here means the
  -- API routes must project it out when serving the client).
  internal_note   TEXT,
  resolved_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT support_requests_priority_check
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT support_requests_status_check
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed'))
);

CREATE INDEX IF NOT EXISTS idx_support_requests_user_id
  ON support_requests (user_id);
CREATE INDEX IF NOT EXISTS idx_support_requests_status
  ON support_requests (status);
CREATE INDEX IF NOT EXISTS idx_support_requests_user_status
  ON support_requests (user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_requests_created_at
  ON support_requests (created_at DESC);

ALTER TABLE support_requests ENABLE ROW LEVEL SECURITY;

-- A client reads only their own requests.
DROP POLICY IF EXISTS "support_requests_self_select" ON support_requests;
CREATE POLICY "support_requests_self_select" ON support_requests
  FOR SELECT
  USING (user_id = auth.uid());

-- A client inserts their own request (title/description/priority/project_id).
-- Status, admin fields, timestamps etc. must stay at their defaults — the
-- WITH CHECK clause pins user_id, and the self-update policy below forbids
-- client updates entirely so admin-driven columns can't be touched by them.
DROP POLICY IF EXISTS "support_requests_self_insert" ON support_requests;
CREATE POLICY "support_requests_self_insert" ON support_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'open' AND response_note IS NULL AND internal_note IS NULL AND resolved_at IS NULL);

-- Platform admin may read every row for the admin panel.
DROP POLICY IF EXISTS "support_requests_platform_admin_read" ON support_requests;
CREATE POLICY "support_requests_platform_admin_read" ON support_requests
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION support_requests_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_requests_updated_at ON support_requests;
CREATE TRIGGER support_requests_updated_at
  BEFORE UPDATE ON support_requests
  FOR EACH ROW
  EXECUTE FUNCTION support_requests_set_updated_at();
