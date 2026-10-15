-- Phase 1 — Migration 016
-- Personal-account model: profiles + client_invites.
--
-- SYNTRA now onboards individual clients instead of organisations. This migration:
--   • profiles        — one row per client user, 1:1 with auth.users
--   • client_invites  — one-time, 30-minute magic-token invites created by platform admin
--
-- These live alongside the existing org tables (organizations, organization_members,
-- team_invites) which stay for existing clients. New clients come in via this flow.

-- ── profiles ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  company_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  avatar_url    TEXT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profiles_status_check
    CHECK (status IN ('pending', 'active', 'suspended'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_email_lower
  ON profiles (lower(email));

CREATE INDEX IF NOT EXISTS idx_profiles_status ON profiles (status);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- A client reads and updates only their own profile row. Admin writes bypass RLS
-- via the service-role client (lib/supabase/service.ts).
DROP POLICY IF EXISTS "profiles_self_select" ON profiles;
CREATE POLICY "profiles_self_select" ON profiles
  FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "profiles_self_update" ON profiles;
CREATE POLICY "profiles_self_update" ON profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- A client can update their own profile row, but not their status/email/id —
-- those are platform-controlled. A trigger enforces this because PG RLS
-- cannot restrict individual column mutations conditionally. Service-role
-- updates (where auth.uid() is null) bypass this trigger.
CREATE OR REPLACE FUNCTION profiles_prevent_privileged_self_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = NEW.id THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'profiles.status cannot be modified by the row''s own user';
    END IF;
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'profiles.email cannot be modified by the row''s own user';
    END IF;
    IF NEW.id IS DISTINCT FROM OLD.id THEN
      RAISE EXCEPTION 'profiles.id cannot be modified';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_prevent_privileged_self_updates ON profiles;
CREATE TRIGGER profiles_prevent_privileged_self_updates
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_prevent_privileged_self_updates();

-- Platform-level staff still need to read every profile for the admin panel.
-- These policies grant that WITHOUT exposing data to a client who happens to
-- hold a stale platform admin flag — the predicate reads app_metadata, which
-- only the service role can write (see lib/auth/platform-admin.ts).
DROP POLICY IF EXISTS "profiles_platform_admin_read" ON profiles;
CREATE POLICY "profiles_platform_admin_read" ON profiles
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- updated_at auto-maintenance
CREATE OR REPLACE FUNCTION profiles_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_set_updated_at();

-- ── client_invites ───────────────────────────────────────────────────────────
-- A pending invitation to activate a personal account. Distinct from team_invites
-- (org-based team-member invitation). The user row in auth.users is created at
-- invite time with email_confirm=true and no password; the invite carries the
-- one-time token the client exchanges for a password.
CREATE TABLE IF NOT EXISTS client_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        TEXT NOT NULL,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  expires_at   timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  accepted_at  timestamptz,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_invites_token      ON client_invites (token);
CREATE INDEX IF NOT EXISTS idx_client_invites_email      ON client_invites (lower(email));
CREATE INDEX IF NOT EXISTS idx_client_invites_user_id    ON client_invites (user_id);
CREATE INDEX IF NOT EXISTS idx_client_invites_expires_at ON client_invites (expires_at);

ALTER TABLE client_invites ENABLE ROW LEVEL SECURITY;

-- No direct client access. Admin creates invites via /api/auth/invite (service
-- role) and clients exchange tokens via /api/auth/set-password (service role).
-- Platform admin may read invites through the admin panel.
DROP POLICY IF EXISTS "client_invites_platform_admin_read" ON client_invites;
CREATE POLICY "client_invites_platform_admin_read" ON client_invites
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );
