-- Phase 2 — Migration 017
-- client_services: which service areas each personal-account client has
-- active. Drives the suite's service-filtered sidebar — see SYNTRA_SDD.md §4.3
-- and SYNTRA_SDLC.md §6.
--
-- The service column is a free text with a check-constraint for forward
-- compatibility; adding a new service means landing a one-line migration
-- that widens the check, not a schema change.

CREATE TABLE IF NOT EXISTS client_services (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service     TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_services_service_check
    CHECK (service IN (
      'website',
      'automations',
      'monitoring',
      'support',
      'reports',
      'hermes',
      'billing'
    )),
  CONSTRAINT client_services_user_service_unique UNIQUE (user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_client_services_user_id
  ON client_services (user_id);
CREATE INDEX IF NOT EXISTS idx_client_services_user_active
  ON client_services (user_id, active) WHERE active = true;

ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;

-- A client reads only their own service rows. Writes always go through the
-- service role (admin configures services) — no client-side mutation path.
DROP POLICY IF EXISTS "client_services_self_select" ON client_services;
CREATE POLICY "client_services_self_select" ON client_services
  FOR SELECT
  USING (user_id = auth.uid());

-- Platform admin may read every row for the admin panel. The predicate reads
-- app_metadata (service-role writable only) rather than any client-mutable
-- field — matches the pattern used by profiles in migration 016.
DROP POLICY IF EXISTS "client_services_platform_admin_read" ON client_services;
CREATE POLICY "client_services_platform_admin_read" ON client_services
  FOR SELECT
  USING (
    (auth.jwt() -> 'app_metadata' ->> 'is_admin')::boolean = true
  );

-- updated_at auto-maintenance (identical shape to profiles trigger)
CREATE OR REPLACE FUNCTION client_services_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS client_services_updated_at ON client_services;
CREATE TRIGGER client_services_updated_at
  BEFORE UPDATE ON client_services
  FOR EACH ROW
  EXECUTE FUNCTION client_services_set_updated_at();
