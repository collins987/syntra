-- 007_credentials.sql
-- SYNTRA holds every client credential; n8n holds exactly one workflow token.
-- See SYNTRA_BUILD_PLAN.md §3 Decision A — this is what makes SYNTRA's authority
-- structural rather than advisory.

-- ─── Client credentials ───────────────────────────────────────────────────────
-- SERVICE ROLE ONLY. RLS is enabled with no permissive policy, so anon and
-- authenticated roles are denied outright. There is no client-side read path.

CREATE TABLE IF NOT EXISTS org_credentials (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id          uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider        text NOT NULL,
  label           text NOT NULL,

  -- AES-256-GCM ciphertext produced by lib/crypto.ts. Never a plaintext secret.
  encrypted_value text NOT NULL,
  -- Last 4 chars of the plaintext, for "which key is this?" without decrypting.
  hint            text,

  scopes          text[] NOT NULL DEFAULT '{}',
  status          text NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'revoked', 'expired')),
  last_used_at    timestamptz,
  expires_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (org_id, provider, label)
);

CREATE INDEX IF NOT EXISTS idx_org_credentials_org ON org_credentials(org_id);

ALTER TABLE org_credentials ENABLE ROW LEVEL SECURITY;
-- Deliberately no policy: only the service role reaches this table.

DROP TRIGGER IF EXISTS set_updated_at ON org_credentials;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON org_credentials
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Workflow tokens ──────────────────────────────────────────────────────────
-- The only credential n8n ever holds. Scoped to one org and a capability list,
-- so a compromised n8n yields one org's narrow grant, not a credential vault.

CREATE TABLE IF NOT EXISTS workflow_tokens (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id       uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  label        text NOT NULL DEFAULT 'n8n',

  -- SHA-256 of the token. The plaintext is shown once, at creation, and never stored.
  token_hash   text NOT NULL UNIQUE,
  capabilities text[] NOT NULL DEFAULT '{}',

  last_used_at timestamptz,
  revoked_at   timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workflow_tokens_hash ON workflow_tokens(token_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE workflow_tokens ENABLE ROW LEVEL SECURITY;

-- Members may see that a token exists (label, last used, scopes) to manage it.
-- token_hash is never selected by application code.
DROP POLICY IF EXISTS "org_member_read_workflow_tokens" ON workflow_tokens;
CREATE POLICY "org_member_read_workflow_tokens" ON workflow_tokens
  FOR SELECT USING (org_id IN (SELECT auth_user_org_ids()));
