# F-03 Fix Plan — Who May Approve an Agent's Action

| | |
|---|---|
| **Defect** | D-003 / F-03 (QA_TEST_PLAN.md) |
| **Severity** | High |
| **Status** | Plan approved for implementation |
| **Date** | 2026-09-16 |

---

## 1. The problem, fully scoped

The QA review flagged one line: `/api/ai/approvals` checks org membership but not role. Tracing the whole approval path turned up **five weaknesses**. Fixing only the first would leave the other four open.

| # | Weakness | Where | Why it matters |
|---|---|---|---|
| 1 | **No role check.** Any member, including `CLIENT_USER`, can approve or reject. | `api/ai/approvals/route.ts` | A junior user can release an irreversible email or Slack post. Every other governance route (agents, budget, tokens, credentials) is already admin-only, so this is also inconsistent. |
| 2 | **The database bypasses the API.** `ai_approvals` has a `FOR ALL` RLS policy for members. | `006_ai_governance.sql` | Any member can call Supabase REST directly and **rewrite `proposed_action`** on a pending item (change the recipient or body), then have an admin approve something other than what the agent proposed. They can also insert fake approvals or flip statuses. A route check alone doesn't stop this. |
| 3 | **Same bypass on agent settings and budget.** `ai_agents` and `ai_usage_budgets` are `FOR ALL` for members. | `005_ai_agents.sql`, `0001_initial.sql` | A member can grant an agent tools, un-pause it, or switch off the budget hard stop without going through the admin-only APIs. The runtime ceiling in `policy.ts` still limits autonomy, but tool grants, pause state and budget have no such backstop. |
| 4 | **Check-then-act race.** `executeApproval` reads `pending`, runs the action, and only *then* writes `approved`. | `lib/ai/gateway.ts` | An Approve and a Reject arriving together can both succeed: the email is sent **and** the record says rejected. The idempotency key stops a double send but not this contradiction. |
| 5 | **No re-authorisation at execution.** Approving doesn't re-check the agent. | `lib/ai/gateway.ts` | If an admin pauses Ava or removes `email.send` from her after she proposed an email, approving still sends it. The decision was made against a state that no longer exists. |

A sixth gap is a consequence of #4: if the action fails *after* approval, nothing records the failure on the approval, and the portal shows "approved" as if it happened.

---

## 2. Best-practice principles applied

1. **Least privilege.** Only people accountable for the business decide what goes out in its name. Deciding is an admin act, like changing agent settings or budget.
2. **Defence in depth.** Enforce in three layers so no single mistake reopens the hole: **database (RLS) → API (role check) → UI (hide controls)**. The UI layer is for usability, not security.
3. **One rule, one place.** The role check lives in one helper, `canDecideApprovals()`, used by the API and every page. It isn't re-implemented in each file.
4. **Deny by default and fail closed.** Unknown role, unknown agent, missing tool or expired request all mean "no".
5. **Atomic state transitions.** Claim the approval (`pending → approved`) with a single conditional update **before** running anything. Exactly one decision can ever win.
6. **Re-authorise at the moment of action (no TOCTOU).** Approving means "allowed as of the proposal". Execution checks the policy again as of now.
7. **Immutability of what was approved.** Members can read approvals but never write them. Only the server (service role) creates and transitions them, so what an admin sees is what runs.
8. **Complete audit trail.** Record who decided, when, and whether execution succeeded or failed, in `ai_approvals`, `action_log` and `audit_logs` (shown on the Activity page).
9. **The client owns the decision.** SYNTRA platform staff roles (`ADMIN`, `SUPER_ADMIN`) do **not** approve on a client's behalf; only the client's `CLIENT_ADMIN` does. Platform staff act through `/admin`, which is read-only for approvals.

---

## 3. Decisions

| Question | Decision | Reason |
|---|---|---|
| Who can **approve**? | `CLIENT_ADMIN` only | Releases actions to the outside world |
| Who can **reject**? | `CLIENT_ADMIN` only | One simple rule ("admins decide"). A member rejecting would silently cancel work an admin asked for. |
| What do members see? | The full queue, read-only, labelled "Waiting for an admin" | Transparency without authority |
| Paused agent / revoked tool at approval time | Refuse, leave the item **pending**, log `blocked` | The admin can resume the agent and approve, or reject. Nothing is lost. |
| Execution fails after approval | Status stays `approved`; new `execution_status = 'failed'` + `execution_error` | The decision and the outcome are different facts, so record both |

---

## 4. Implementation

### 4.1 Database — migration `010_approval_authorization.sql`

- `ai_approvals`: replace `FOR ALL` with **`FOR SELECT`** for org members. There are no member INSERT, UPDATE or DELETE policies. Writes happen only through the service role.
- Add `executed_at timestamptz`, `execution_status text CHECK (IN ('succeeded','failed'))`, `execution_error text`.
- `ai_agents`: replace `FOR ALL` with `FOR SELECT`.
- `ai_usage_budgets`: replace `org_member_access_ai_budgets` (`FOR ALL`) with `FOR SELECT`.
- Idempotent (`DROP POLICY IF EXISTS`, `ADD COLUMN IF NOT EXISTS`), safe to re-run.

Verified before writing: every write to these three tables in `apps/web` already uses `createServiceClient()`. The user-session client only reads them, so no feature breaks.

### 4.2 Shared rule — `lib/org.ts`

```ts
export function canDecideApprovals(role: string): boolean
```

`CLIENT_ADMIN` → `true`; everything else, including unknown values, → `false`.

### 4.3 API — `api/ai/approvals/route.ts`

- After authentication: if `!canDecideApprovals(org.role)`, return **`403`** "Only an organisation admin can approve or reject agent actions". Applies to both decisions.
- Write an `audit_logs` row (`approval.approved` / `approval.rejected`) with the approval id, capability and outcome.

### 4.4 Gateway — `executeApproval()` in `lib/ai/gateway.ts`

The new order is:

1. **Load** the approval scoped to the org. Not found → error.
2. **Re-authorise** with the new `authorizeApprovedAction(agent, capability)` in `policy.ts`: the agent exists and is `active`, and at least one of its **granted** tools maps to this capability. On failure, log `blocked` to `action_log`, leave the item pending and return the reason.
3. **Claim atomically:** `UPDATE … SET status='approved', decided_by, decided_at WHERE id=? AND org_id=? AND status='pending' AND expires_at > now() RETURNING id`. No row → re-read to report "already decided" or mark `expired`.
4. **Execute** via `executeAction` with idempotency key `approval:<id>` (unchanged).
5. **Record the outcome:** `execution_status`, `execution_error`, `executed_at`.

The reject path already uses a conditional `WHERE status='pending'` update, and it keeps doing so. Approve and reject now race safely: whichever update lands first wins, and the other gets `409`.

### 4.5 UI

- `/portal/approvals`: the page passes `canDecide`. Members see no buttons, just the note "An admin in your organisation needs to approve this", and the panel title changes from "Waiting for you" to "Waiting for an admin".
- Decided items show **Failed** when `execution_status = 'failed'`, instead of a misleading "approved".
- `/portal/ai` inline notice: "Waiting for your approval" becomes "Waiting for an admin's approval" for members.
- `/portal/activity`: add labels for `approval.approved`, `approval.rejected`, `ai_agent.updated`, `ai_budget.updated`.

---

## 5. Verification

### 5.1 Static
`tsc --noEmit`, `next lint`, `next build`.

### 5.2 Tests added to QA_TEST_PLAN.md

| ID | Test | Expected |
|---|---|---|
| APR-06 | USER-A approves via API | `403`; nothing executes |
| APR-09 | USER-A rejects via API | `403` |
| APR-10 | USER-A sees `/portal/approvals` | Queue visible, no buttons, "needs an admin" note |
| APR-11 | USER-A `PATCH /rest/v1/ai_approvals` changing `proposed_action` | 0 rows updated |
| APR-12 | USER-A `POST /rest/v1/ai_approvals` (fake approval) | Rejected |
| APR-13 | Pause Ava after she proposes, then ADMIN-A approves | Refused with reason; still pending; `action_log` `blocked`; nothing sent |
| APR-14 | Approve + Reject sent simultaneously | Exactly one `200`, the other `409`; final status matches what happened |
| APR-15 | Approve an action whose adapter fails | `approved` + `execution_status='failed'`; UI shows Failed |
| APR-16 | USER-A `PATCH /rest/v1/ai_agents` (grant tool / un-pause) | 0 rows updated |
| BUD-06 | USER-A `PATCH /rest/v1/ai_usage_budgets` `hard_stop=false` | 0 rows updated |

### 5.3 Rollout

1. **Run `010_approval_authorization.sql` first** in Supabase SQL Editor (after 005–009). The current production code keeps working afterwards: it only reads these tables with the user client and writes them with the service role.
2. Then push the code; Vercel deploys. The new approvals page selects the new columns, so deploying before the migration would show an empty queue.
3. Run APR-06 and APR-09 to APR-16, and BUD-06.
4. Update D-003 in the defect log to **Fixed**.

**Rollback:** re-create the previous `FOR ALL` policies (statements at the bottom of the migration, commented out). Code rollback is a normal Vercel redeploy.

---

## 6. Out of scope, but found during this review

These use the same pattern, member `FOR ALL` policies that make an API-level check ineffective. Logged as **F-08** for a separate fix, because tightening them changes onboarding and billing flows that need their own testing.

| Table | Risk |
|---|---|
| `subscriptions`, `invoices` | A member could set their own subscription to `active` / `os` via REST, a **billing bypass** |
| `integrations` | The admin-only policy from 003 is **ineffective**: the member `FOR ALL` policy from 0001 was never dropped, and permissive policies are OR'd |
| `automations`, `workflow_executions`, `leads`, `projects`, `websites`, `ai_requests` | Members can forge or delete operational data and usage records |

The recommended follow-up is the same approach as 4.1: `SELECT` for members, writes only through admin-checked server routes.
