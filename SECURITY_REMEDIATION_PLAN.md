# Security Remediation Plan — F-01, F-02, F-08, F-09

| | |
|---|---|
| **Defects** | F-01, F-02, F-08 (from `QA_TEST_PLAN.md`), F-09 (found during this work) |
| **Related** | F-03, fixed separately (`F-03_APPROVAL_AUTHORIZATION_PLAN.md`, migration 010) |
| **Date** | 2026-09-17 |
| **Migration** | `packages/db/migrations/011_rls_hardening.sql` |

---

## 0. Principles applied to every fix

| # | Principle | In practice |
|---|---|---|
| 1 | **Fail closed** | Missing configuration means "refuse", never "allow". A secret that isn't set is an outage, not an open door. |
| 2 | **Authorise at the data boundary** | RLS is the last line of defence. Members *read* their org's data. Writes go only through server routes that check identity, role and ownership first, then use the service role. |
| 3 | **Never trust the client for authority** | Org id, plan, role and admin status come from the server (session, membership, provider API), never from the request body or user-editable metadata. |
| 4 | **Verify the whole claim** | A payment proves *who* paid, *how much*, *for what*, and that it hasn't been used before, not merely that a payment exists. |
| 5 | **Authenticate machines with signed, fresh, one-time messages** | Timestamped HMAC, tolerance window, constant-time comparison, deduplication. |
| 6 | **Defence in depth** | Database + API + UI. The UI hides what a user can't do, but that is never the control. |
| 7 | **Don't leak internals** | Clients get generic errors; details go to server logs / Sentry. |
| 8 | **Least privilege** | Each caller gets the narrowest scope that does the job. A client admin syncs *their* workflows, not everyone's. |

---

## 1. F-01 — `/api/n8n/sync` authentication

### Findings
| # | Issue |
|---|---|
| 1a | `if (secret && header !== secret)` accepts every request when `CRON_SECRET` is unset. It's set in production today, but any new environment (preview, staging, a rotated project) would be open. |
| 1b | Plain `!==` comparison leaks timing information. |
| 1c | **The portal Sync button is already broken in production.** It posts without the secret, so it gets `401`. |
| 1d | If it did work, **any member of any org** would trigger a *global* sync touching every organisation's automations. |
| 1e | A leftover `GET` handler (from the removed Vercel cron) performs writes. State changes over `GET` can be triggered by links, prefetchers and crawlers. |
| 1f | An unreachable n8n returns `500`, which fails the GitHub Action, which expects `503`/`504` for "n8n is down". Raw n8n error text is returned to the caller. |

### Fix
- **Three explicitly authorised callers:**

  | Caller | How it proves itself | Scope |
  |---|---|---|
  | GitHub Actions cron | `x-cron-secret`, compared in constant time | All orgs |
  | Platform admin (portal) | Session + `app_metadata.is_admin` (see F-09) | All orgs |
  | Client admin (portal) | Session + `CLIENT_ADMIN` membership | **Only their org's existing rows.** Never inserts, never touches another org. |
  | Anyone else | — | `401` / `403` |
- Machine path with `CRON_SECRET` unset → `503 "Sync is not configured"`.
- Remove `GET`.
- n8n unreachable → `503`; details logged server-side only.
- The Sync button renders only for users allowed to use it.

---

## 2. F-02 — `/api/n8n/webhook` authentication

### Findings
| # | Issue |
|---|---|
| 2a | `if (!secret) return true`: **no verification at all while `N8N_WEBHOOK_SECRET` is unset, which is the case in production now.** Anyone can forge execution records and trigger "automation failed" emails to clients (phishing with SYNTRA's real sender). |
| 2b | No timestamp, so a captured signed request can be replayed forever. |
| 2c | No deduplication: n8n retries (or replays) create duplicate executions and duplicate emails. |
| 2d | Trusts `payload.orgId` when no automation matches, which would let the caller email any org's admin. |
| 2e | Emails only one admin, and `.maybeSingle()` errors when an org has two, so **the alert silently never sends.** |
| 2f | No body size limit or payload validation; internal error messages returned to caller. |

### Fix
- **No secret → `503`** in every environment. For local development, set a local secret.
- **Signature v2:**
  ```
  x-syntra-timestamp: <unix seconds>
  x-syntra-signature: sha256=<hex HMAC-SHA256(secret, "<timestamp>.<raw body>")>
  ```
  Requests older or newer than **5 minutes** are rejected. The signature is compared in constant time and must be a well-formed 64-hex digest.
- **Idempotency:** a unique index on `workflow_executions.n8n_execution_id`. A repeat returns `200 {duplicate: true}` with no new row and no email.
- `orgId` is **only** derived from the `automations` row that owns `workflowId`. Unknown workflow → `202 ignored`, logged.
- Alert **every** `CLIENT_ADMIN` of the org; error text truncated.
- 64 KB body limit (`413`), required-field validation (`400`), generic `500`.

**n8n side:** a ready-to-paste Code node that signs requests is in §6.

---

## 3. F-08 — Row Level Security: members can write their org's data

### Findings
`0001_initial.sql` gives org members `FOR ALL` (read **and write**) on nine tables. Postgres combines permissive policies with **OR**, so any stricter policy added later has no effect while a `FOR ALL` one remains.

| Table | Concrete abuse via Supabase REST with a normal member login |
|---|---|
| `subscriptions` | `PATCH {status:"active", plan:"os", current_period_end:"2099-01-01"}` → **free OS plan** |
| `invoices` | Forge "paid" invoices, delete history |
| `integrations` | 003's admin-only policy is **ineffective** (0001's member policy was never dropped); members can read tokens in `config` |
| `leads`, `projects`, `websites`, `automations`, `workflow_executions` | Forge, alter or delete operational records |
| `ai_requests` | **Delete usage records**, which undermines budget enforcement and cost accounting |
| `support_tickets` | Alter or delete tickets |
| `notifications` | `FOR ALL` on own rows, so a user can insert fake notifications to themselves |

Also found in the same review:

| # | Issue |
|---|---|
| 8a | View `org_ai_spend_by_month` runs with its owner's rights (Postgres default), so it **bypasses RLS**: any signed-in user can read every org's AI spend. |
| 8b | `org_cost_ledger` is readable by members, which exposes SYNTRA's internal cost-to-serve and margins to clients. |
| 8c | `team_invites` admin policy is `FOR ALL`: admins can insert invites directly, bypassing the API's duplicate check, email and audit. |
| 8d | `auth_user_org_ids()` is `SECURITY DEFINER` without a fixed `search_path` (Supabase linter: *function_search_path_mutable*). |
| 8e | **Payment linking trusts the client.** `/api/stripe/link-subscription` and `/api/intasend/link-subscription` take `orgId` from the body with no membership check, don't confirm the payment belongs to the caller, and `upsert` on the provider id can **move an existing subscription row to a different org**. Today RLS is the only thing limiting this. Removing member write access without fixing the routes would make it worse, so both change together. |
| 8f | `/api/onboarding` writes with the user's session, which is why member write policies seemed necessary. It also accepts any string as `plan`. |

### Fix — database (migration 011)
| Table | Before | After |
|---|---|---|
| `subscriptions`, `invoices`, `projects`, `websites`, `leads`, `automations`, `workflow_executions`, `ai_requests`, `support_tickets` | members `FOR ALL` | members **`SELECT`** |
| `integrations` | members `FOR ALL` + admins `FOR ALL` | admins **`SELECT`** only |
| `team_invites` | admins `FOR ALL` | admins **`SELECT`** only |
| `notifications` | own rows `FOR ALL` | own rows **`SELECT` + `UPDATE`** (mark as read) |
| `org_cost_ledger` | members `SELECT` | **no member policy** (service role / platform admin only) |
| `org_ai_spend_by_month` | owner rights | **`security_invoker = true`**; `anon` revoked |
| `workflow_executions` | — | unique `n8n_execution_id` (F-02) |
| `auth_user_org_ids()` | mutable `search_path` | `SET search_path = public, pg_temp` |

Unchanged: `organizations` and `organization_members` (already read-only), `ai_*` (migration 010), `action_log` (read-only), `org_credentials` (no policy), `workflow_tokens` (read-only), `email_logs`, `audit_logs` (read-only).

Verified before writing: every other write in `apps/web` already uses the service role **after** an explicit check. The only user-session writers were the three routes below.

### Fix — routes
**`/api/onboarding`**
- Identity from the session; writes with the service role.
- Validates: plan is a real `PlanId`; name ≤ 100 chars; slug `^[a-z0-9](?:[a-z0-9-]{1,48}[a-z0-9])$`.
- Slug taken → `409` with a clear message (not a raw Postgres error).
- If the membership insert fails, the new org is deleted, so no orphans.
- `organizations.plan` is the *requested* plan until a verified payment sets it (below). Access is never gated on it.

**`/api/stripe/link-subscription`**
1. Org comes from the caller's membership; a mismatched `orgId` in the body → `403`. Caller must be `CLIENT_ADMIN`.
2. Checkout session must be `status: complete`, and `metadata.user_id` must equal the caller (set at checkout).
3. Plan from `planFromStripePriceId()` (unchanged: never guesses).
4. If the Stripe subscription is already linked to **another** org → `409`. Never reassigned.
5. Write with the service role; set `organizations.plan` to the verified plan.

**`/api/intasend/link-subscription`**
1. Same org derivation and `CLIENT_ADMIN` requirement.
2. IntaSend invoice must be `COMPLETE`, **its `api_ref` must equal the `apiRef` sent**, and currency must be KES.
3. Amount ≥ plan price (unchanged).
4. If this invoice or api_ref is already linked to another org → `409`. **One payment activates one org.**
5. Service-role write; set `organizations.plan`.

---

## 4. F-09 (Critical) — Anyone can make themselves a platform admin

### Finding
`/admin` is guarded by `user.user_metadata.is_admin`. **`user_metadata` is writable by the user themselves**:

```js
await supabase.auth.updateUser({ data: { is_admin: true } })   // from any browser console
```

Every `/admin` page reads with the service role, so this exposes all clients, leads, subscriptions, revenue, AI spend and margins. The guard is also only in the layout. Next.js recommends checking authorisation next to the data, because layouts aren't a dependable boundary for every render path.

### Fix
- Use **`app_metadata.is_admin`**, which only the service role / SQL can write.
- One helper, `requirePlatformAdmin()`, called in the admin layout **and** at the top of every admin page.
- One-time SQL to grant yourself access (§6). The old `user_metadata` flag is ignored from now on.

---

## 5. Rollout order

Order matters: the new code needs the new schema, and the old code keeps working on the new schema.

| Step | Action | Why here |
|---|---|---|
| 1 | Run **010** (if not already), then **011** in Supabase SQL Editor | The old code keeps working: its three user-session writers only run during onboarding and payment linking, and nothing else writes with the user client. **Don't onboard a customer between steps 1 and 3.** |
| 2 | Run the §6 SQL to set `app_metadata.is_admin` on your account | Otherwise you lose `/admin` access at step 3 |
| 3 | Push the code; Vercel deploys | — |
| 4 | Confirm `CRON_SECRET` is set in Vercel **and** GitHub secrets | F-01 now fails closed |
| 5 | When the n8n domain is live: set `N8N_WEBHOOK_SECRET` in Vercel + n8n, add the §6 signing node | Until then the webhook returns `503`, which is the intended safe state |
| 6 | Run the QA tests in §7 | — |

**Rollback:** migration 011 has a commented rollback section. Code rolls back through a Vercel redeploy. Rolling back code **without** rolling back 011 breaks onboarding, so roll back both or neither.

---

## 6. Operational snippets

**Grant platform admin (run once, replace the email):**
```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"is_admin": true}'
where email = 'you@example.com';
```
Sign out and back in so the new token carries the claim.

**n8n: sign the webhook call.** Add a Code node before the HTTP Request node:
```js
const crypto = require('crypto');
const secret = $env.N8N_WEBHOOK_SECRET;            // set in n8n's environment
const body = JSON.stringify({
  workflowId: $workflow.id,
  executionId: $execution.id,
  workflowName: $workflow.name,
  status: $json.status ?? 'success',               // 'success' | 'error'
  error: $json.error ?? null,
  startedAt: $json.startedAt ?? null,
  stoppedAt: new Date().toISOString(),
});
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = 'sha256=' + crypto.createHmac('sha256', secret)
  .update(`${timestamp}.${body}`).digest('hex');
return [{ json: { body, timestamp, signature } }];
```
Then the HTTP Request node: `POST https://www.syntraco.tech/api/n8n/webhook`, headers `x-syntra-timestamp: {{$json.timestamp}}`, `x-syntra-signature: {{$json.signature}}`, `Content-Type: application/json`, body = raw `{{$json.body}}`. **Send the exact string that was signed; don't let n8n re-serialise it.**

**Verify migration 011:**
```sql
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' and cmd <> 'SELECT'
order by tablename;
-- Expected: exactly one row, notifications / user_update_own_notifications (UPDATE).
```

---

## 7. Verification

| ID | Test | Expected |
|---|---|---|
| SYNC-01 | `POST /api/n8n/sync` no header, not logged in | `401` |
| SYNC-02 | Wrong `x-cron-secret` | `401` |
| SYNC-03 | `CRON_SECRET` unset locally, header sent | `503` |
| SYNC-04 | `GET /api/n8n/sync` | `405` |
| SYNC-05 | `CLIENT_USER` clicks/posts Sync | Button hidden; API `403` |
| SYNC-06 | `CLIENT_ADMIN` syncs | `200`; only their org's rows updated; no inserts |
| SYNC-07 | n8n stopped, cron call | `503`; GitHub Action green |
| WH-01 | `N8N_WEBHOOK_SECRET` unset | `503` for every request |
| WH-02 | Missing/garbage signature | `401` |
| WH-03 | Valid signature, timestamp 10 min old | `401` |
| WH-04 | Valid, fresh, known workflow | `200`; one execution row |
| WH-05 | Same request again | `200 {duplicate:true}`; no new row, no email |
| WH-06 | Unknown `workflowId` with `orgId` of another org | `202 ignored`; nothing written; no email |
| WH-07 | Failure event, org with 2 admins | Both receive the alert |
| WH-08 | 100 KB body | `413` |
| RLS-01 | Member `PATCH /rest/v1/subscriptions` `{status:"active",plan:"os"}` | `[]`, unchanged |
| RLS-02 | Member `POST`/`PATCH`/`DELETE` on each of the 9 org tables | Refused / 0 rows |
| RLS-03 | Member `GET /rest/v1/integrations` | `[]` (admin sees own org only) |
| RLS-04 | Member `GET /rest/v1/org_ai_spend_by_month` | Own org only; anon → refused |
| RLS-05 | Member `GET /rest/v1/org_cost_ledger` | `[]` |
| RLS-06 | Portal regression: dashboard, leads, automations, billing, analytics, reports, realtime feed | Unchanged, still populated |
| PAY-01 | Link a Stripe session to an org you don't belong to | `403` |
| PAY-02 | Link another user's Stripe session id | `403` |
| PAY-03 | Link an already-linked Stripe subscription to a second org | `409`; original row untouched |
| PAY-04 | IntaSend: real paid `invoiceId` with a different `apiRef` | `400` |
| PAY-05 | IntaSend: reuse a linked invoice for a second org | `409` |
| PAY-06 | `CLIENT_USER` calls either link route | `403` |
| PAY-07 | Successful link | Subscription row + `organizations.plan` = verified plan |
| ONB-11 | Onboard with `serviceType: "enterprise"` | `400` |
| ONB-12 | Onboard with a taken slug | `409` with a clear message |
| ADM-08 | Normal user runs `supabase.auth.updateUser({data:{is_admin:true}})`, then visits `/admin` | Redirected; no data |
| ADM-09 | Account with `app_metadata.is_admin` | `/admin` works |
