# SYNTRA — The AI Operating System for Modern Business

**Internal Vision Brief · September 2026**  
Domain: `syntraco.tech` · Stack: Next.js 15 · Supabase · Vercel · Markets: Kenya · Global SME

---

## The Problem We Solve

Most small and mid-size businesses — especially across East Africa — spend the majority of their operational hours on tasks that should not require a human: following up leads, sending invoices, updating spreadsheets, posting content, answering the same ten customer questions. The tools to automate this exist, but they are fragmented, expensive, and require technical expertise most business owners don't have.

SYNTRA is a single platform that absorbs those costs. **We build, deploy, and operate the automation layer for you** — as a service, not a software license.

> **Who this is for:** Any business generating revenue that has more operational tasks than operational capacity. The primary market is Kenyan SMEs (M-Pesa native, mobile-first) with a parallel international market on USD card billing. The platform is built to serve both simultaneously.

---

## The Products

Three core services, two capabilities, one complete platform. Structure locked in `SYNTRA_BUILD_PLAN.md` §2 — it does not change without a versioned revision of that document.

### Core services — what you buy

| Service | Description | Pricing |
|---|---|---|
| **Syntra Sites** | We build and continuously improve your website so it brings in customers without you touching it. Conversion-focused copy, on-page SEO, monthly improvements, CDN hosting at 99.9% uptime. | $297/mo · KES 38,700 |
| **Syntra Flow** | We take the repetitive work your team does by hand and make it happen automatically — customer records, invoices, order routing, approvals, status emails. Runs 24/7. | $497/mo · KES 64,700 |
| **Syntra Marketing** | We keep your marketing running — content in your brand voice, scheduled social posts, email sequences, campaign reporting — so your pipeline never goes quiet. | $697/mo · KES 90,700 |

### Capabilities — what those services are made of

Never sold separately. Present in every plan.

| Capability | Description |
|---|---|
| **Lead Intelligence** | Every inbound lead is scored (A/B/C/D tier, 0–100) on revenue, industry and engagement signals, then routed into the client's lead table in real time — and followed up automatically. |
| **AI Agents** | Ava, Max and Leo: three agents trained on the client's business context, budget-enforced per organisation, backed by Claude. Autonomy is graded per plan (see the autonomy levels in `SYNTRA_BUILD_PLAN.md` §3). |

### Complete platform

| Plan | Description | Pricing |
|---|---|---|
| **Syntra OS** | Sites + Flow + Marketing combined, with agents at full capability, a dedicated implementation manager, weekly strategy calls and a 2-hour support SLA. | $997/mo · KES 129,700 |

> **Why OS costs less than the sum.** The three services bought separately are $1,491. OS is $997 — a 33% bundle discount, priced deliberately: a client running all three is structurally hard to churn.

### The customer promise

> **SYNTRA runs the repetitive parts of your business using AI and automation.**

The stack — Claude, n8n, Supabase — appears nowhere in customer-facing copy above the fold. It is the *how*, and the buyer does not care.

---

## Current Build Status

| Phase | Components | Status |
|---|---|---|
| Phase 1 — Foundation | Monorepo · design system · 15-table Supabase schema · auth middleware · dashboard | ✅ Live |
| Phase 2 — Revenue Layer | Stripe checkout + webhooks · IntaSend M-Pesa STK Push · onboarding wizard | ✅ Live |
| Phase 2.6 — Marketing Site | Home · Pricing · Services · About · Contact · Case Studies · Legal | ✅ Live |
| Phase 3 Sprint 1 — Platform Core | Sentry error tracking · Resend transactional email · real-time dashboard data | ✅ Live |
| Phase 3 Sprint 2 — Settings + Admin | Settings page · team management · invite flow · activity log · full admin panel | ✅ Live |
| Phase 3 Sprint 3 — n8n Integration | n8n REST client · sync route · webhook · GitHub Actions cron · manual sync button | 🔄 Partial |
| Phase 3 Sprint 3 — AI Agents | Claude API client · budget enforcement · agent UI · chat interface | ⏳ Next |
| Phase 3 Sprint 4 — Portal Pages | Marketing · Analytics · Reports · Clients · Integrations | ⏳ Planned |

---

## Technical Architecture

Every layer is purpose-built and directly connected. Data flows from customer action to database to portal in real time.

| Layer | Components |
|---|---|
| **Client** | Next.js 15 App Router · Marketing site · Client portal · Admin panel |
| **Auth** | Supabase Auth SSR · Middleware guard · 3 client types · RLS policies |
| **Database** | Supabase Postgres · 15 tables · Realtime subscriptions · Service role |
| **Payments** | Stripe · IntaSend M-Pesa · Webhooks verified · Subscription sync |
| **Automation** | n8n (Azure VM) · REST API v1 · GitHub Actions cron · HMAC webhooks |
| **Email** | Resend · React Email templates · 4 email types · `email_logs` table |
| **Observability** | Sentry · Source maps · PII stripped · `global-error` boundary |
| **AI** | Claude API · Budget per org · Ava · Max · Leo *(Sprint 3)* |
| **Deploy** | Vercel · GitHub CI/CD · Turborepo · pnpm workspaces |

---

## The Customer Journey

Every touchpoint is handled by the platform — no manual handoff required once the system is running.

**1. Discovery + lead capture**  
Visitor hits `/audit` → fills out the free automation audit form → submitted to `/api/audit` → scored 0–100 using revenue, industry, and engagement signals → stored in `leads` table with A/B/C/D tier. Appears in the admin panel instantly.

**2. Payment — card or M-Pesa**  
Prospect hits `/pricing` → chooses USD card (Stripe Checkout) or M-Pesa (IntaSend STK Push inline — no redirect). On success, redirected to `/onboarding` with a session reference. Payment verified server-side before the org is created.

**3. Onboarding wizard**  
4-step wizard (Business → Service → Goals → Launch) creates the `organizations` row, `organization_members` membership, and the first `projects` row. Links the payment subscription. Sends a Resend welcome email on completion.

**4. Portal + team access**  
Client lands in `/portal/dashboard` with real-time KPIs. They can invite team members via Settings → Team — an invite email goes out via Resend, the recipient accepts at `/invite/[token]`, and is added to the org with a role (Admin or Member).

**5. Automation execution**  
n8n workflows run on the Azure VM on schedule. Every execution fires a webhook to `/api/n8n/webhook` (HMAC-verified) → writes a `workflow_executions` row → updates `automations.last_run_at` → appears in the portal Live Activity feed via Supabase Realtime in under 2 seconds. Failures trigger a Resend error alert to the org owner.

**6. Billing + reporting**  
Stripe and IntaSend send payment events to their respective webhook routes → `invoices` and `subscriptions` tables are updated automatically. The client sees their billing history at `/portal/billing`.

---

## The AI Layer — Sprint 3

Three agents. One context. Every client.

The AI layer is not a chatbot bolted onto the side. Each agent is a persistent, context-aware entity trained on the client's business: their org name, their industry, their active automations, their lead data, their current plan.

### Ava — Website & Content
Manages the client's website copy, SEO optimisation, and content calendar. Drafts blog posts, generates landing page variations, and flags conversion issues.

### Max — Workflow & Operations
Monitors n8n automation health, explains failed executions in plain English, suggests workflow improvements, and can propose new n8n workflow configs.

### Leo — Business Intelligence
Analyses lead scoring trends, forecasts revenue from the active pipeline, surfaces anomalies in weekly performance, and answers "why" questions about the business data.

### How the AI layer is built

Each agent call goes through `lib/claude.ts`, which wraps the Anthropic SDK. Before every request it checks `ai_usage_budgets` — a per-org monthly spend cap. If the org is within budget, it calls `claude-sonnet-5` for complex reasoning or `claude-haiku-4-5` for fast lookups. Every request and its token count is logged to `ai_requests` for billing, analytics, and future model fine-tuning.

### The long-term vision for Max

Rather than just diagnosing failed n8n workflows, Max will eventually be able to *create* them — given a plain-English description of a process, it generates the n8n workflow JSON and deploys it to the client's n8n instance via the REST API. A business owner says "when a new lead scores above 70, send them a WhatsApp message and add them to our CRM" — Max does it, without anyone writing a workflow.

### n8n as the execution layer

n8n is the bridge between the AI layer and the real world. Claude decides what should happen; n8n makes it happen. This architecture keeps AI costs low (Claude is only invoked when reasoning is needed) while keeping execution reliable and auditable. Every execution is logged, every failure is surfaced, every status is real-time in the portal.

The n8n instance is self-hosted on Azure, giving full control over data residency — critical for clients in regulated industries. The GitHub Actions sync workflow runs every 15 minutes, keeping the `automations` table in sync without Vercel cron costs.

---

## The Data Model

Every table in the database is anchored to an `org_id`. This means the platform naturally supports agencies managing multiple client accounts, internal teams with different roles, and future multi-tenancy without architectural changes.

```
organizations → organization_members → auth.users
organizations → subscriptions → invoices
organizations → automations → workflow_executions
organizations → leads · websites · projects
organizations → ai_requests · ai_usage_budgets
organizations → audit_logs · team_invites
```

Row Level Security is enforced at the database layer for every table — a user can only read and write rows that belong to their org. The service role key (used only in API routes, never exposed to the browser) bypasses RLS only for cross-org admin operations like the admin panel's aggregate queries.

---

## The Vision

> **The core thesis:** Every small business should have access to the same operational leverage that a 50-person company with a head of ops, a marketing team, and a data analyst has. SYNTRA delivers that leverage as a service, for a flat monthly fee, with no headcount required.

| Horizon | Milestone |
|---|---|
| **Now** | Platform live. Payments, portal, team management, n8n sync, and admin panel all operational. First clients can onboard and see real automation data in the portal. |
| **Q4 2026** | AI agents ship. Ava, Max, and Leo go live for Syntra OS clients. Max can explain and diagnose n8n failures in natural language. Leo produces weekly business intelligence summaries automatically. |
| **Q1 2027** | Workflow generation. Max can create n8n workflows from plain-English descriptions. The client describes a process; the agent builds and deploys it. First step toward a fully autonomous ops layer. |
| **Q2 2027** | Multi-channel AI. Agents available in WhatsApp, email, and embedded chat on the client's own website. Customer-facing AI that represents the client's brand, trained on their product catalogue and FAQs. |
| **2028** | Autonomous business operations. The platform proactively manages campaigns, re-engages cold leads, adjusts pricing based on demand signals, and reports anomalies without being asked. A business owner logs in to approve, not to operate. |

---

## Immediate Next Steps — To Complete Sprint 3

**1. Start the Azure VM**  
The n8n instance is already configured on Azure — it just needs to be started. Once running, the base URL and port are available.

**2. Add n8n env vars to `.env.local` and Vercel**
```
N8N_BASE_URL=
N8N_API_KEY=
N8N_WEBHOOK_SECRET=
N8N_ORG_ID=
CRON_SECRET=
```

**3. Add GitHub Actions secrets**  
`NEXT_PUBLIC_APP_URL` and `CRON_SECRET` in the repo's Settings → Secrets → Actions. This activates the 15-minute sync workflow.

**4. Run Supabase migrations**  
Migrations 002, 003, and 004 need to run in Supabase SQL Editor to enable M-Pesa columns, team invites, integrations, and email logs tables.

**5. Build `lib/claude.ts` and AI agent UI**  
Sprint 3 AI work: Anthropic SDK client with budget enforcement, `/api/ai/chat` route, agent management page, and the chat interface for Ava, Max, and Leo.

---

*SYNTRA · syntraco.tech · © 2026*
