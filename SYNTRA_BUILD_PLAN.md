# SYNTRA — Final Build Plan

**Version 1.0 · 16 September 2026 · Target completion: 15 December 2026**

> This document supersedes all prior roadmaps. It is the authoritative sequence for completing the SYNTRA system.
> `SYNTRA_VISION.md` remains the north star (what we are building toward). This is the build order (what we do next, and in what order).

---

## 0. What changed from the reviewed plan

The reviewed plan was strategically correct and is adopted almost wholesale. Six changes were made, each for a specific reason:

| # | Change | Reason |
|---|---|---|
| 1 | **Guardrails ship *before* the first agent, not after** | The reviewed sequence was `AI Gateway → Ava → AI controls → Max`. You cannot retrofit permissions onto a shipped agent — the moment Ava can write, every missing control is a live liability. Permissions, budgets, and the approval queue are part of the Gateway's first commit. |
| 2 | **n8n never holds client credentials** | The reviewed plan says "SYNTRA should be the authority" but leaves it as policy. Policy is not enforcement. We make it structural: n8n calls back into SYNTRA to act, so it *cannot* act unilaterally. See [Decision A](#decision-a--n8n-never-holds-client-credentials). |
| 3 | **Syntra Marketing gets a real price ($697 / KES 90,700)** | "Custom" breaks the entire payment architecture — Stripe Checkout and IntaSend STK Push are both price-ID driven. A "Custom" tier cannot be bought, only enquired about, which drops it out of the self-serve funnel we already built. |
| 4 | **First customers move from stage 9 to stage 5, running in parallel** | The reviewed plan correctly says "don't wait until everything is finished" and then schedules customers ninth. Customer acquisition is now a parallel track that starts as soon as the automation layer is trustworthy. |
| 5 | **Lead Intelligence and AI Agents are demoted from "services" to "capabilities"** | The reviewed plan identified the category error. We go further: they are removed from the purchasable-plan list entirely. You buy Sites, Flow, Marketing, or OS. Intelligence is what all four are made of. |
| 6 | **Every stage has explicit acceptance criteria** | The reviewed plan had no definition of done, which is how a 90-day plan becomes a 9-month plan. Nothing is "complete" until its criteria pass. |

One thing was **removed** rather than changed: the reviewed plan's Stage 14 "SYNTRA Control Plane" was scoped as a new internal product. We already have `/admin`. It becomes an extension of the existing panel, not a rebuild.

---

## 1. The current inconsistency (fix first, costs one day)

The codebase currently contains **three different product taxonomies**, all live in production:

| Source | Products listed |
|---|---|
| [`(marketing)/page.tsx`](apps/web/src/app/(marketing)/page.tsx) | 6 — Sites, Flow, Marketing, Leads, AI, OS |
| [`(marketing)/services/page.tsx`](apps/web/src/app/(marketing)/services/page.tsx) | 6 — Sites, Flow, Marketing, Leads, AI, OS |
| [`lib/pricing.ts`](apps/web/src/lib/pricing.ts) | 3 — Sites, Flow, OS |
| `SYNTRA_VISION.md` | 5 services |

**The commercial consequence:** a prospect reads about Syntra Marketing on `/services`, clicks through to `/pricing`, and finds no way to buy it. Two of six advertised products are unpurchasable. This is the highest-ROI fix in this document and it is not a feature — it is a defect.

---

## 2. Product structure (locked)

This structure is final. It does not change again without a versioned revision of this document.

```
SYNTRA
│
├── CORE SERVICES ─────────────── (what you buy)
│   ├── SYNTRA Sites        $297/mo   KES 38,700
│   ├── SYNTRA Flow         $497/mo   KES 64,700
│   └── SYNTRA Marketing    $697/mo   KES 90,700
│
├── CAPABILITIES ──────────────── (what they are made of — never sold alone)
│   ├── Lead Intelligence         in every plan
│   └── AI Agents — Ava/Max/Leo   Level by plan (see §4)
│
└── COMPLETE PLATFORM ─────────── (the destination)
    └── SYNTRA OS           $997/mo   KES 129,700
        = Sites + Flow + Marketing + full-autonomy agents
```

**Why OS is priced below the sum.** Sites + Flow + Marketing bought separately is $1,491. OS is $997 — a 33% bundle discount. This is deliberate: OS is the product we want every client to reach, because a client on all three services is structurally hard to churn.

### The customer-facing promise

One sentence, used verbatim on the homepage, in the pitch, and in the audit report:

> **SYNTRA runs the repetitive parts of your business using AI and automation.**

Supporting sentence:

> We build and manage your website, marketing, workflows, and AI systems — so your business runs with less manual work.

The technology stack (Claude, n8n, Supabase) appears **nowhere** in customer-facing copy above the fold. It is the *how*, and the buyer does not care. It belongs on `/about` and in technical documentation only.

### Add-ons (the growth surface)

Priced separately so plans stay stable as the business grows:

- Additional AI usage beyond plan allowance — metered
- Additional automation workflows beyond plan cap
- Additional marketing channels
- Custom integrations — one-time build fee
- Dedicated AI agent with custom training
- WhatsApp Business automation

### Files to change

| File | Change |
|---|---|
| `lib/pricing.ts` | Add `marketing` plan. Add `capabilities[]` field distinct from `features[]`. |
| `(marketing)/page.tsx` | 6 cards → 3 service cards + capabilities band + OS card |
| `(marketing)/services/page.tsx` | Same restructure; remove "Syntra Leads" and "Syntra AI" as standalone entries |
| `(marketing)/pricing/page.tsx` | 4 purchasable plans |
| `onboarding/page.tsx` | Step 2 service list must match |
| `SYNTRA_VISION.md` | "Five services" → the structure above |
| `.env.local` + Vercel | `NEXT_PUBLIC_STRIPE_PRICE_MARKETING`, `NEXT_PUBLIC_INTASEND_PRICE_MARKETING_KES=90700` |
| Stripe Dashboard | Create 4th product: Syntra Marketing, $697/mo recurring |

---

## 3. Architectural decisions

Four decisions that constrain everything built afterward. Each is expensive to reverse, so each is settled here.

### Decision A — n8n never holds client credentials

**This is the most important decision in this document.**

The obvious architecture is: put each client's API keys into n8n, let workflows call Slack/WhatsApp/CRM directly. It is also the architecture that ends the company if one workflow is misconfigured. On a single self-hosted n8n instance, workflow-level credential isolation is an enterprise feature we do not have. One client's workflow reaching another client's credentials is a business-ending event, not a bug.

**Instead:** SYNTRA holds all client credentials, encrypted, in Supabase. n8n holds exactly one credential — a SYNTRA workflow token. When a workflow needs to act, it calls back:

```
n8n workflow step
      ↓  POST /api/actions/whatsapp.send
      ↓  Authorization: Bearer <workflow token>
      ↓  Idempotency-Key: <execution_id>:<step>
SYNTRA Action Gateway
      ├── resolve token → org_id
      ├── check capability is granted to this org
      ├── check policy engine allows this action
      ├── check idempotency key not already used
      ├── decrypt org credential
      ├── execute
      └── write action_log row
```

**What this buys:**
- n8n is compromised → attacker gets a token scoped to one org, not a credential vault
- Every action against the outside world is logged in one table, with no exceptions
- The policy engine has a real enforcement point instead of being advisory
- Adding a provider (Twilio → Africa's Talking) changes one file, not every client's workflows
- When Max eventually generates workflows, it *physically cannot* generate one that exceeds its permissions

**Cost:** roughly two weeks of work in Stage 2, and every integration needs a SYNTRA-side adapter. Accept it. This decision is why the platform can safely become autonomous later.

**Pragmatic exception:** read-only, non-sensitive nodes (an RSS fetch, a public API GET) may run directly in n8n. Anything that writes, sends, charges, or reads customer data goes through the Gateway. No exceptions for convenience.

### Decision B — Claude decides, SYNTRA authorises, n8n executes

Three roles, never blurred:

| Layer | Responsibility | Never does |
|---|---|---|
| **Claude** | Reasons, drafts, classifies, recommends | Executes anything. Holds credentials. |
| **SYNTRA** | Authorises, enforces policy, logs, bills | Reasons about business logic |
| **n8n** | Executes approved mechanical steps | Decides whether to act |

Claude's output is always a *proposal*. SYNTRA's policy engine converts a proposal into an authorised action, or into an approval request. n8n carries it out.

A concrete trace:

```
Lead submitted at /audit
      ↓
Claude scores it → { score: 86, tier: "A", reason: "..." }
      ↓
SYNTRA policy engine:
      · agent = Leo, autonomy = Level 2
      · action = whatsapp.send
      · rule = "score > 70 → allowed, no approval"
      · budget = within limit
      → AUTHORISED
      ↓
n8n executes → Action Gateway → WhatsApp sent
      ↓
action_log row written, cost attributed to org
```

If the rule had been Level 1, the same trace ends at an approval card in the client's portal instead.

### Decision C — Autonomy is a number in the database, not a description

The reviewed plan's five autonomy levels are correct and adopted. The improvement: they are **enforced**, stored as `ai_agents.autonomy_level`, checked by the policy engine on every single action.

| Level | Name | Behaviour | Example |
|---|---|---|---|
| **0** | Manual | Agent suggests in chat. Human does it elsewhere. | "Here's a draft post — copy it into LinkedIn." |
| **1** | Assisted | Agent prepares the action. Human approves in portal. | "Draft ready. [Approve] [Edit] [Reject]" |
| **2** | Automated | Agent executes pre-defined actions inside fixed rules. | Approved post → auto-scheduled and published |
| **3** | Autonomous | Agent decides *and* executes within declared boundaries. | Agent writes and publishes to the content calendar unprompted |
| **4** | Proactive | Agent detects a condition and initiates new work. | "Engagement down 22% — launching recovery campaign within budget." |

Rules that are not negotiable:

- Every agent starts at **Level 1** for a new organisation. Always. No exceptions for enthusiastic clients.
- Promotion to Level 2 requires **20 approved actions of that type with zero rejections** for that org.
- **Level 3 requires explicit written client opt-in**, recorded with a timestamp in `audit_logs`.
- **Level 4 does not ship in this plan.** It is 2027 work. It is listed so the schema accommodates it.
- Any single rejection at Level 2+ drops that capability back to Level 1 for that org and notifies the client.
- Irreversible actions — sending money, deleting data, emailing a client's customer list — are capped at Level 1 permanently, regardless of history.

### Decision D — The AI Gateway is the only path to a model

No file outside `lib/ai/` imports the Anthropic SDK. Lint rule enforces it.

```
Application code
      ↓
lib/ai/gateway.ts     ← the only caller of the Anthropic SDK
      ├── resolve agent + org context
      ├── check budget (ai_usage_budgets) → hard stop if exceeded
      ├── check rate limit
      ├── select model (opus-5 reasoning / haiku-4-5 classification)
      ├── inject system context + tool grants
      ├── call Claude
      ├── record tokens + cost (ai_requests)
      ├── route tool calls → policy engine → action gateway
      └── return
```

This is what makes multi-provider support a config change later rather than a rewrite. It is also the only place where cost can be measured accurately — and cost accuracy is what tells us whether a $497 plan is profitable.

---

## 4. Agent specifications

Each agent is defined by what it may do, what it may never do, and its ceiling.

### Ava — Website & Content
*Ships first. Lowest blast radius: content is reviewable before it is public.*

| | |
|---|---|
| **Can** | Draft website copy · generate blog posts · propose SEO changes · analyse page performance · generate landing-page variants |
| **Cannot** | Publish without approval below Level 2 · touch billing · delete pages · change DNS or domains · modify other orgs' content |
| **Tools** | `content.draft` · `content.publish` (L2+) · `seo.analyse` · `site.read` |
| **Ceiling** | Level 3 |

### Max — Workflow & Operations
*Ships second. Highest blast radius — Max touches live business processes.*

| | |
|---|---|
| **Can** | Read workflow definitions · diagnose failed executions in plain English · propose new workflows · modify workflows after approval · toggle workflows on/off (L2+) |
| **Cannot** | Deploy a generated workflow without approval — **at any level, until 2027** · access another org's workflows · create credentials · disable error alerting |
| **Tools** | `workflow.read` · `workflow.diagnose` · `workflow.propose` · `workflow.deploy` (L2+, approval always) |
| **Ceiling** | Level 2 in this plan |

> **Note on Max.** Workflow generation is the single most valuable and most dangerous capability in SYNTRA. A generated workflow that emails a client's entire customer list is unrecoverable. Max proposes; a human deploys. That constraint holds until we have shipped 100+ human-approved generated workflows and can measure the error rate.

### Leo — Business Intelligence
*Ships third. Read-mostly, so it is the safest to raise to Level 3.*

| | |
|---|---|
| **Can** | Analyse leads and scoring trends · forecast revenue from pipeline · detect anomalies · generate reports · answer questions about business data |
| **Cannot** | Contact customers directly · modify financial records · alter lead scores manually · export data outside the org |
| **Tools** | `data.query` (org-scoped) · `report.generate` · `forecast.run` |
| **Ceiling** | Level 3 |

Every agent carries the same envelope, stored per-org:

```
Agent
├── identity + role
├── business context      (org name, industry, plan, active automations)
├── autonomy_level        0–4, enforced
├── granted tools         explicit allowlist, deny by default
├── spend limit           inherited from ai_usage_budgets
├── approval requirements per-capability
├── rate limits
├── audit trail           every call in ai_requests + action_log
└── human override        client can pause any agent instantly
```

---

## 5. Schema additions

Seven new tables and four alterations. Migration files `005`–`009`.

```sql
-- 005_ai_agents.sql
ai_agents
  id, org_id, agent_key ('ava'|'max'|'leo'), display_name,
  autonomy_level int NOT NULL DEFAULT 1 CHECK (autonomy_level BETWEEN 0 AND 4),
  status ('active'|'paused'|'disabled') DEFAULT 'active',
  business_context jsonb,          -- injected into system prompt
  granted_tools text[] DEFAULT '{}',   -- deny by default
  created_at, updated_at
  UNIQUE (org_id, agent_key)

-- 006_ai_governance.sql
ai_approvals                        -- the human-in-the-loop queue
  id, org_id, agent_id, capability, proposed_action jsonb,
  summary text,                     -- plain-English, shown in portal
  status ('pending'|'approved'|'rejected'|'expired'),
  decided_by uuid, decided_at, expires_at, created_at

action_log                          -- every action SYNTRA took on a client's behalf
  id, org_id, actor ('agent'|'workflow'|'human'|'system'), actor_ref,
  capability, request jsonb, result jsonb,
  status ('success'|'failed'|'blocked'),
  blocked_reason text,
  idempotency_key text UNIQUE,      -- prevents double-send on n8n retry
  cost_usd numeric(10,6), duration_ms, created_at

-- 007_credentials.sql
org_credentials                     -- Decision A: SYNTRA holds these, n8n does not
  id, org_id, provider, label,
  encrypted_value bytea,            -- pgsodium / Supabase Vault
  scopes text[], status, last_used_at, expires_at, created_at

workflow_tokens                     -- n8n's only credential
  id, org_id, token_hash, capabilities text[],
  last_used_at, revoked_at, created_at

-- 008_templates.sql
automation_templates                -- the agency → product transition
  id, slug UNIQUE, name, category, description,
  n8n_definition jsonb,             -- parameterised workflow blueprint
  required_capabilities text[],
  required_credentials text[],
  variables jsonb,                  -- what must be filled per client
  version int, status ('draft'|'published'|'deprecated'), created_at

-- 009_economics.sql
org_cost_ledger                     -- cost per customer, computed not guessed
  id, org_id, period date, category ('ai'|'infra'|'email'|'payments'|'sms'),
  amount_usd numeric(10,4), source, created_at
  UNIQUE (org_id, period, category, source)
```

**Alterations:**

```sql
ALTER TABLE automations
  ADD COLUMN template_id uuid REFERENCES automation_templates(id),
  ADD COLUMN template_version int,
  ADD COLUMN monthly_execution_count int NOT NULL DEFAULT 0,
  ADD COLUMN owner_user_id uuid REFERENCES auth.users(id);

ALTER TABLE ai_usage_budgets
  ADD COLUMN hard_stop boolean NOT NULL DEFAULT true,   -- refuse, don't overspend
  ADD COLUMN overage_allowed_usd numeric(10,2) DEFAULT 0;

ALTER TABLE leads
  ADD COLUMN ai_score int,
  ADD COLUMN ai_reasoning text;      -- separate from the deterministic score

ALTER TABLE organizations
  ADD COLUMN plan text;              -- 'sites'|'flow'|'marketing'|'os'
```

RLS on every new table follows the existing `auth_user_org_ids()` pattern. **`org_credentials` is service-role only** — no client-side read path exists, ever. `action_log` is `SELECT`-only for org members; it is an audit record and must not be mutable from the client.

---

## 6. The seven stages

Dates assume one primary developer. Stages 5 and 6 overlap deliberately.

---

### Stage 0 — Unblock · 16–22 Sep

Nothing in this plan can start until the existing half-configured infrastructure is live. This is checklist work, not engineering.

- [ ] Run migrations `002`, `003`, `004` in Supabase SQL Editor
- [ ] Start the n8n Azure VM; record base URL
- [ ] Add `N8N_BASE_URL`, `N8N_API_KEY`, `N8N_WEBHOOK_SECRET`, `N8N_ORG_ID`, `CRON_SECRET` to `.env.local` and Vercel
- [ ] Add `NEXT_PUBLIC_APP_URL` + `CRON_SECRET` to GitHub repo secrets
- [ ] Create 4 Stripe products (Sites, Flow, **Marketing**, OS) → price IDs → Vercel
- [ ] Configure Stripe webhook → copy `STRIPE_WEBHOOK_SECRET`
- [ ] Add A record `@ → 76.76.21.21` at the .tech registrar
- [ ] Set `is_admin: true` in **app_metadata** (not user_metadata) on your own Supabase Auth user — SQL in `SECURITY_REMEDIATION_PLAN.md` §6
- [ ] Rename org `0bd49ad6-e2a6-4e53-85e3-566bb972965b` → "SYNTRA Internal"

**Acceptance:** `/portal/automations` → Sync button returns a non-zero workflow count. A test Stripe checkout completes and writes a `subscriptions` row. `/admin` loads.

---

### Stage 1 — Product clarity · 23–29 Sep

Resolve the three-taxonomy conflict from §1. Ship the locked structure from §2.

- [ ] `lib/pricing.ts` — 4 plans, `capabilities[]` separated from `features[]`
- [ ] Rebuild `/pricing` — 4 purchasable plans, Marketing included
- [ ] Rebuild `/` and `/services` — 3 services + capabilities band + OS
- [ ] Rewrite hero copy to the outcome-led promise; remove all stack names above the fold
- [ ] Update onboarding Step 2 to match
- [ ] Update `SYNTRA_VISION.md`
- [ ] Write the one-page service definition for each of the four plans — exactly what is delivered, what is not, and turnaround time

**Acceptance:** every product named anywhere on the marketing site has a working purchase path. A stranger reading the homepage can state what SYNTRA does in one sentence without using the words *AI*, *workflow*, or *automation*.

---

### Stage 2 — Automation layer as product · 30 Sep – 13 Oct

The largest engineering stage. Implements [Decision A](#decision-a--n8n-never-holds-client-credentials).

- [ ] Migration `007` — `org_credentials`, `workflow_tokens`
- [ ] `lib/crypto.ts` — envelope encryption via Supabase Vault
- [ ] **Action Gateway** — `POST /api/actions/[capability]`
  - [ ] Bearer workflow-token auth → resolve `org_id`
  - [ ] Capability allowlist check
  - [ ] `Idempotency-Key` header, enforced against `action_log`
  - [ ] Credential decrypt → execute → log
- [ ] First three adapters: `email.send` (Resend), `crm.upsert`, `sheet.append`
- [ ] `lib/automation-manager.ts` — SYNTRA-side view of every workflow: id, name, client, status, last execution, duration, success/failure, error, trigger, next run, monthly executions, cost, owner, version
- [ ] Rebuild `/portal/automations` — clients never open n8n
- [ ] Failure recovery: retry with backoff, dead-letter state, client-visible "needs attention"
- [ ] Extend `/api/n8n/webhook` to increment `monthly_execution_count`

**Acceptance:** a workflow sends a real email through the Action Gateway using a credential that exists only in Supabase. Replaying the same execution twice produces one email and one `action_log` row. n8n contains zero client credentials.

---

### Stage 3 — Portal + control plane · 14–27 Oct

The portal is where SYNTRA stops being an agency and becomes a product.

**Client portal** — the morning view:

```
Good morning, Acme Ltd.

BUSINESS HEALTH
Leads 142 · Qualified 38 · Automations 24
Tasks automated 1,842 · AI usage 64%

LIVE ACTIVITY
✓ New lead qualified      ✓ Invoice sent
✓ Follow-up email sent    ⚠ Workflow needs attention

YOUR AI TEAM
Ava ● Working   Max ● Monitoring   Leo ● Analyzing
```

- [ ] Rebuild `/portal/dashboard` to the above — outcomes, not infrastructure
- [ ] `/portal/approvals` — the Level 1 queue (built before any agent can fill it)
- [ ] `/portal/ai-usage` — requests, tokens, cost, budget remaining, per-agent split
- [ ] `/portal/integrations` — connect credentials; writes to `org_credentials`
- [ ] Complete subscription states: trialing, past_due, canceled, paused — with correct portal degradation for each

**Control plane** — extend the existing `/admin`:

- [ ] `/admin/health` — n8n reachability, failed executions, error rates, Sentry summary
- [ ] `/admin/economics` — **cost per customer**, computed from `org_cost_ledger`:
      revenue − (Claude + infra + email + payment fees) = gross contribution per org
- [ ] `/admin/ai` — usage and spend across all orgs
- [ ] Nightly job writing `org_cost_ledger` from `ai_requests` + provider costs

**Acceptance:** `/admin/economics` shows real gross contribution per organisation from live data. Every plan is confirmed profitable, or repriced before Stage 5.

---

### Stage 4 — AI Gateway + Ava · 28 Oct – 17 Nov

Guardrails and the first agent ship **together**.

Week 1 — Gateway and governance, no agent yet:
- [ ] Migrations `005`, `006`
- [ ] `lib/ai/gateway.ts` — the sole Anthropic SDK caller
- [ ] Budget enforcement with `hard_stop` — refuse over budget, never silently overspend
- [ ] `lib/ai/policy.ts` — the authorisation engine: agent + capability + autonomy level + rules → allow / approve / deny
- [ ] Tool registry with deny-by-default grants
- [ ] Approval flow: proposal → `ai_approvals` → portal card → decision → execution
- [ ] Rate limiting per org and per agent
- [ ] ESLint rule banning `@anthropic-ai/sdk` imports outside `lib/ai/`

Week 2–3 — Ava, at Level 1 only:
- [ ] `/api/ai/chat` — streaming, through the gateway
- [ ] `/portal/ai` — chat interface
- [ ] `/portal/ai-agents` — per-agent config, autonomy level, pause switch
- [ ] Ava's tools: `content.draft`, `seo.analyse`, `site.read`
- [ ] Every Ava write action routes to the approval queue

**Acceptance:** Ava drafts real website copy. It reaches `/portal/approvals`, not the live site. An over-budget org gets a clean refusal, not a surprise invoice. A capability not on the allowlist is blocked and appears in `action_log` with `status='blocked'`.

---

### Stage 5 — First three customers · from 4 Nov, parallel

Runs alongside Stages 4 and 6. **This stage is not optional and does not wait for feature completeness.**

- [ ] SYNTRA becomes its own first client — full loop: audit → Lead Intelligence → payment → onboarding → portal → live automations → reporting, all running on SYNTRA
- [ ] Sign 3 paying businesses. Discount heavily; charge something. Free pilots do not produce honest feedback.
- [ ] Onboard each manually and **record every manual step** — that list is the Stage 6 backlog
- [ ] Weekly 15-minute check-in per client for the first month

Measure, per client: what they asked to automate · which integrations they needed · how much support they consumed · their actual AI spend · which features they never opened.

**Acceptance:** three organisations with active subscriptions and at least one automation each that has run successfully for 14 consecutive days without manual intervention. "SYNTRA runs SYNTRA" is demonstrably true and screenshot-able.

> **The discipline that matters here:** do not build a feature because one customer asked. Build it when **three** customers ask, or when one asks and the ask is on the critical path to their renewal. Everything else goes on a list and waits for a pattern.

---

### Stage 6 — Templates + Max · 18 Nov – 8 Dec

Convert Stage 5's manual work into reusable product.

- [ ] Migration `008` — `automation_templates`
- [ ] Template engine: blueprint + client variables → deployed n8n workflow
- [ ] Build the first five, drawn from what Stage 5 clients actually needed:

| Template | Flow |
|---|---|
| Lead Management | Lead → Score → CRM → Notify → Follow-up |
| Appointments | Booking → Confirm → Remind → Follow-up → Review request |
| Invoicing | Order → Invoice → Payment → Receipt → Reminder |
| Content Marketing | Idea → AI draft → Approve → Schedule → Publish → Analytics |
| Customer Support | Question → AI → Knowledge base → Response → Escalate |

- [ ] `/portal/automations/library` — client-facing template catalogue
- [ ] `/admin/templates` — authoring and versioning
- [ ] **Max**, Level 1: read workflows, diagnose failures in plain English, propose changes
- [ ] Failure diagnosis wired to the existing `WorkflowErrorEmail` — the alert now explains the cause

**Acceptance:** a new client is onboarded using templates plus configuration only — no bespoke workflow building. Max correctly diagnoses five real historical failures from `workflow_executions`.

---

### Stage 7 — Leo + review · 9–15 Dec

- [ ] **Leo**, Level 1 → 2: lead analysis, revenue forecast, anomaly detection
- [ ] Weekly report generation wired to the existing `WeeklyReportEmail` template
- [ ] `/portal/reports`
- [ ] First autonomy promotions: Ava and Leo to Level 2 where the 20-action threshold is met
- [ ] **Quarterly review** — write `SYNTRA_BUILD_PLAN.md` v2 from evidence, not ambition

**Acceptance:** every client receives an accurate automated weekly report. At least one capability has been promoted to Level 2 against real approval history.

---

## 7. Explicitly not building before 2027

Scope discipline is the difference between shipping in December and shipping in April. These are all good ideas. None are next.

| Deferred | Why | Earliest |
|---|---|---|
| **Level 4 proactive agents** | Requires autonomy track record we will not have | Q3 2027 |
| **Max auto-deploying generated workflows** | Needs 100+ approved generations to measure error rate | Q2 2027 |
| **WhatsApp / multi-channel agents** | Needs Meta Business verification; slow and orthogonal | Q2 2027 |
| **Mobile app** | The portal is responsive; no validated demand | — |
| **White-label / reseller** | Zero customers have asked | — |
| **Multi-provider AI** | The Gateway makes this a config change later. Do not build the abstraction before the second provider exists. | On demand |
| **Self-serve workflow builder** | Competes with our own service model | — |
| **Per-client n8n instances** | Decision A removes the isolation pressure that motivated it | Only if scale forces it |

If a stakeholder asks for one of these, the answer is: *"It's on the 2027 plan. Here's what ships before it and why that order."*

---

## 8. Definition of done

SYNTRA is complete for this cycle when this loop runs end to end for three real businesses without manual intervention:

```
Payment → Onboarding → Automation live → AI-assisted operation → Measurable result
```

Measured by:

| Metric | Target by 15 Dec 2026 |
|---|---|
| Paying organisations | 3 |
| Automations running 14+ days unattended | ≥ 1 per client |
| Gross contribution per client | Positive, computed from `org_cost_ledger` |
| Manual steps in onboarding | ≤ 2 |
| Agent actions rejected at approval | < 20% |
| Unhandled workflow failures reaching a client | 0 |
| Client credentials stored in n8n | 0 |

The last two are pass/fail. A single client-visible unhandled failure, or a single credential found in n8n, blocks the cycle from being called complete regardless of every other metric.

---

## 9. Build order, one line

> **Product clarity → automation layer (credentials out of n8n) → portal + economics → AI Gateway with guardrails → Ava → first 3 customers → templates → Max → Leo → autonomy promotion.**

And the sentence that should survive every future revision of this document:

> **Businesses tell SYNTRA what they need done. SYNTRA's AI understands it, its automation layer executes it, and the platform continuously shows the business owner what's happening.**

---

*SYNTRA LLC · syntraco.tech · Build Plan v1.0 · Review due 15 December 2026*
