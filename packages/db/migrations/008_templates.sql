-- 008_templates.sql
-- Reusable automation blueprints — the agency → product transition.
-- A new client becomes "template + configuration", not "build from zero".

CREATE TABLE IF NOT EXISTS automation_templates (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug                  text NOT NULL UNIQUE,
  name                  text NOT NULL,
  category              text NOT NULL,
  description           text NOT NULL,

  -- Parameterised n8n workflow. Placeholders are filled from `variables`.
  n8n_definition        jsonb NOT NULL DEFAULT '{}',
  -- Action Gateway capabilities this template needs granted.
  required_capabilities text[] NOT NULL DEFAULT '{}',
  -- Providers the org must have connected before this can deploy.
  required_credentials  text[] NOT NULL DEFAULT '{}',
  -- [{ key, label, help, required, default }]
  variables             jsonb NOT NULL DEFAULT '[]',

  version               int  NOT NULL DEFAULT 1,
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft', 'published', 'deprecated')),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_templates_status ON automation_templates(status);

ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;

-- Templates are SYNTRA's catalogue, not org data: readable by any signed-in
-- user once published; only the service role writes them.
DROP POLICY IF EXISTS "authenticated_read_published_templates" ON automation_templates;
CREATE POLICY "authenticated_read_published_templates" ON automation_templates
  FOR SELECT TO authenticated USING (status = 'published');

DROP TRIGGER IF EXISTS set_updated_at ON automation_templates;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Automation alterations ───────────────────────────────────────────────────

ALTER TABLE automations
  ADD COLUMN IF NOT EXISTS template_id             uuid REFERENCES automation_templates(id),
  ADD COLUMN IF NOT EXISTS template_version        int,
  ADD COLUMN IF NOT EXISTS monthly_execution_count int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS owner_user_id           uuid REFERENCES auth.users(id);

-- ─── Lead alterations ─────────────────────────────────────────────────────────
-- The AI score is kept separate from the deterministic one so we can compare
-- them before trusting the model.

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS ai_score     int,
  ADD COLUMN IF NOT EXISTS ai_reasoning text;

-- ─── Organization plan ────────────────────────────────────────────────────────

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS plan text;
