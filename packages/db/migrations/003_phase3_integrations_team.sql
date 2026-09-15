-- Phase 3 — Migration 003
-- Run in Supabase SQL Editor (Dashboard → SQL Editor → New query)
--
-- Adds:
--   integrations  — connected third-party services per org (Slack, HubSpot, Sheets, Zapier)
--   team_invites  — pending team member invitations
--
-- Both are org-scoped with RLS. Credentials in integrations.config are readable
-- only by org admins (not regular members) since they hold API tokens.

-- ── integrations ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS integrations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL,
  config      jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT integrations_provider_check
    CHECK (provider IN ('slack', 'hubspot', 'google_sheets', 'zapier', 'webhook')),
  CONSTRAINT integrations_org_provider_unique UNIQUE (org_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_integrations_org_id ON integrations (org_id);

ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Only org admins can see/manage integrations (config holds credentials)
DROP POLICY IF EXISTS "org admins manage integrations" ON integrations;
CREATE POLICY "org admins manage integrations" ON integrations
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('CLIENT_ADMIN', 'ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('CLIENT_ADMIN', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ── team_invites ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'CLIENT_USER',
  token       TEXT NOT NULL UNIQUE,
  invited_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT team_invites_role_check
    CHECK (role IN ('CLIENT_ADMIN', 'CLIENT_USER'))
);

CREATE INDEX IF NOT EXISTS idx_team_invites_org_id ON team_invites (org_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_token  ON team_invites (token);
CREATE INDEX IF NOT EXISTS idx_team_invites_email  ON team_invites (email);

ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Org admins manage invites for their own org.
-- Accepting an invite goes through a service-role API route (bypasses RLS),
-- because the invitee is not yet a member and cannot pass this policy.
DROP POLICY IF EXISTS "org admins manage invites" ON team_invites;
CREATE POLICY "org admins manage invites" ON team_invites
  FOR ALL
  USING (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('CLIENT_ADMIN', 'ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    org_id IN (
      SELECT org_id FROM organization_members
      WHERE user_id = auth.uid()
        AND role IN ('CLIENT_ADMIN', 'ADMIN', 'SUPER_ADMIN')
    )
  );

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- The dashboard live activity feed subscribes to workflow_executions.
-- RLS still applies to realtime, so clients only receive their own org's rows.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE workflow_executions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
