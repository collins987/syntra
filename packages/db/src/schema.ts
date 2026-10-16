export type UserRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "STAFF"
  | "PROJECT_MANAGER"
  | "MARKETING_MANAGER"
  | "CLIENT_ADMIN"
  | "CLIENT_USER"

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"

export type ProjectStatus =
  | "onboarding"
  | "in_progress"
  | "review"
  | "approved"
  | "deploying"
  | "live"
  | "paused"
  | "canceled"

export type AutomationStatus = "active" | "paused" | "error" | "draft"

export type ApprovalStatus =
  | "pending"
  | "approved"
  | "revision_requested"
  | "rejected"

export type LeadTier = "A" | "B" | "C" | "D"

export type WorkflowExecutionStatus =
  | "running"
  | "completed"
  | "failed"
  | "retrying"

export interface Organization {
  id: string
  name: string
  slug: string
  plan: string
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  org_id: string
  user_id: string
  role: UserRole
  created_at: string
}

export interface Subscription {
  id: string
  org_id: string
  stripe_subscription_id: string | null
  stripe_customer_id: string | null
  intasend_api_ref: string | null
  intasend_invoice_id: string | null
  payment_provider: "stripe" | "intasend"
  plan: string
  status: SubscriptionStatus
  current_period_start: string | null
  current_period_end: string | null
  cancel_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  org_id: string
  name: string
  service_type: string
  status: ProjectStatus
  onboarding_data: Record<string, unknown>
  brand_data: Record<string, unknown>
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface Website {
  id: string
  org_id: string
  project_id: string
  domain: string | null
  status: string
  preview_url: string | null
  live_url: string | null
  cloudflare_pages_project: string | null
  github_repo: string | null
  deployment_log: unknown[]
  seo_data: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type InterestedService = "sites" | "flow" | "growth" | "os"
export type LeadAssignmentStatus = "unassigned" | "assigned" | "in_progress"
export type AiConfidence = "low" | "medium" | "high"

export interface Lead {
  id: string
  org_id: string
  email: string
  name: string | null
  company: string | null
  source: string | null
  // Deterministic Lead Intelligence — SYNTRA's own policy-driven qualification
  // score. Never written by AI. See lib/leads/scoring.ts.
  score: number
  tier: LeadTier | null
  // AI Intelligence — independent, contextual analysis. Written only by
  // lib/ai/functions/analyze-lead.ts via the ai.analyze_lead Action Gateway
  // capability. Nothing here may ever derive from, feed back into, or be
  // composited with score/tier — see AI_LEAD_INTELLIGENCE_PLAN.md for the
  // hard architectural boundary.
  ai_score: number | null
  ai_reasoning: string | null
  // Audit / cache / version metadata for the AI analysis above. See
  // migration 013. All nullable — a lead that has never been analyzed has
  // ai_analyzed_at IS NULL and every other ai_* field is null.
  ai_analyzed_at: string | null
  ai_model: string | null
  ai_analysis_version: string | null
  ai_analysis_input_hash: string | null
  ai_confidence: AiConfidence | null
  audit_answers: Record<string, unknown>
  audit_report: Record<string, unknown>
  crm_id: string | null
  status: string
  metadata: Record<string, unknown>
  assigned_to: string | null
  assignment_status: LeadAssignmentStatus
  campaign_id: string | null
  interested_service: InterestedService | null
  created_at: string
  updated_at: string
}

export interface LeadScoringPolicy {
  id: string
  org_id: string
  field: "interested_service" | "source" | "revenue" | "industry" | "recency" | "company"
  operator: "equals" | "in" | "range" | "not_null"
  value: unknown
  points: number
  category: "intent" | "qualification" | "engagement" | "completeness"
  explanation: string
  enabled: boolean
  created_at: string
}

export interface Campaign {
  id: string
  org_id: string
  name: string
  channel: string | null
  status: "active" | "paused" | "ended"
  starts_at: string | null
  ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Automation {
  id: string
  org_id: string
  name: string
  workflow_code: string
  n8n_workflow_id: string | null
  status: AutomationStatus
  config: Record<string, unknown>
  last_run_at: string | null
  created_at: string
  updated_at: string
}

export interface WorkflowExecution {
  id: string
  org_id: string
  automation_id: string
  n8n_execution_id: string | null
  status: WorkflowExecutionStatus
  trigger_data: Record<string, unknown>
  result_data: Record<string, unknown>
  error: string | null
  retry_count: number
  started_at: string
  finished_at: string | null
  duration_ms: number | null
}

export interface AIRequest {
  id: string
  org_id: string
  function_name: string
  function_version: string
  model: string
  input_tokens: number
  output_tokens: number
  cost_usd: number
  duration_ms: number | null
  status: string
  error: string | null
  request_id: string
  created_at: string
  // Phase 1f-γ1 correlation columns (migration 014). All nullable; existing
  // pre-γ1 rows remain valid with each set to null.
  action_log_id: string | null
  lead_id: string | null
  actor_user_id: string | null
  trigger_source: string | null
  event_id: string | null
}

export interface AIUsageBudget {
  id: string
  org_id: string
  monthly_limit_usd: number
  current_spend_usd: number
  alert_at_percent: number
  last_reset_at: string
}

export interface SupportTicket {
  id: string
  org_id: string
  user_id: string
  subject: string
  status: string
  priority: string
  messages: unknown[]
  created_at: string
  updated_at: string
}

export interface Invoice {
  id: string
  org_id: string
  stripe_invoice_id: string | null
  amount_cents: number
  currency: string
  status: string
  pdf_url: string | null
  period_start: string | null
  period_end: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  org_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id: string | null
  metadata: Record<string, unknown>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  org_id: string
  type: string
  title: string
  body: string | null
  read_at: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export type IntegrationProvider =
  | "slack"
  | "hubspot"
  | "google_sheets"
  | "zapier"
  | "webhook"

export interface Integration {
  id: string
  org_id: string
  provider: IntegrationProvider
  config: Record<string, unknown>
  enabled: boolean
  last_sync_at: string | null
  created_at: string
  updated_at: string
}

export interface TeamInvite {
  id: string
  org_id: string
  email: string
  role: "CLIENT_ADMIN" | "CLIENT_USER"
  token: string
  invited_by: string | null
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface EmailLog {
  id: string
  org_id: string | null
  to_email: string
  subject: string
  template: string
  resend_id: string | null
  status: "sent" | "failed"
  error: string | null
  created_at: string
}

// ── Personal-account model (migration 016) ───────────────────────────────────
// New clients come in as individual users rather than organisations. See
// SYNTRA_SDD.md §4.1 and §5.3. These sit alongside the org tables above —
// which stay available for existing org-based clients — not replace them.

export type ProfileStatus = "pending" | "active" | "suspended"

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  company_name: string | null
  status: ProfileStatus
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ClientInvite {
  id: string
  email: string
  user_id: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_by: string | null
  created_at: string
}

// ── Suite services (migration 017) ───────────────────────────────────────────

export type ClientServiceKey =
  | "website"
  | "automations"
  | "monitoring"
  | "support"
  | "reports"
  | "hermes"
  | "billing"

export interface ClientService {
  id: string
  user_id: string
  service: ClientServiceKey
  active: boolean
  created_at: string
  updated_at: string
}

// ── Suite projects (migration 018) ───────────────────────────────────────────
// Personal-account builds, distinct from the org-based `projects` table above.

export type ClientProjectType = "website" | "automation" | "both"
export type ClientProjectStatus = "planning" | "building" | "live" | "paused"

export interface ClientProject {
  id: string
  user_id: string
  name: string
  type: ClientProjectType
  status: ClientProjectStatus
  live_url: string | null
  last_deployed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Support requests (migration 019) ─────────────────────────────────────────

export type SupportPriority = "low" | "normal" | "high" | "urgent"
export type SupportStatus = "open" | "in_progress" | "resolved" | "closed"

export interface SupportRequest {
  id: string
  user_id: string
  project_id: string | null
  title: string
  description: string
  priority: SupportPriority
  status: SupportStatus
  /** Client-visible response from the admin. */
  response_note: string | null
  /** Admin-only context. Never serve this to the client. */
  internal_note: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

/** Shape returned to the client — strips the admin-only `internal_note`. */
export type ClientSupportRequest = Omit<SupportRequest, "internal_note">

// ── Automations catalogue (migration 020) ────────────────────────────────────

export type ClientWorkflowStatus = "active" | "inactive" | "error"

export interface ClientWorkflow {
  id: string
  n8n_workflow_id: string | null
  name: string
  description: string | null
  status: ClientWorkflowStatus
  last_run_at: string | null
  time_saved_minutes: number
  cost_saved_usd: number
  created_at: string
  updated_at: string
}

export interface ClientWorkflowAssignment {
  id: string
  workflow_id: string
  user_id: string
  created_at: string
}

/** Shape returned to the client — a workflow row joined with its assignment. */
export interface AssignedClientWorkflow extends ClientWorkflow {
  assignment_id: string
  assigned_at: string
}

// ── Monitoring (migration 021) ───────────────────────────────────────────────

export type MonitoringCheckStatus = "up" | "down" | "degraded"

export interface MonitoringCheck {
  id: string
  project_id: string
  url: string
  status: MonitoringCheckStatus
  status_code: number | null
  response_time_ms: number | null
  error: string | null
  checked_at: string
}

// ── Supabase compatibility helpers ───────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type T<Row, Ins = Partial<Row>> = {
  Row: Row
  Insert: Ins
  Update: Partial<Row>
  Relationships: never[]
}

// Database shape for Supabase client typing
export interface Database {
  public: {
    Tables: {
      organizations: T<Organization, Omit<Organization, "id" | "created_at" | "updated_at">>
      organization_members: T<OrganizationMember, Omit<OrganizationMember, "id" | "created_at">>
      subscriptions: T<Subscription, Omit<Subscription, "id" | "created_at" | "updated_at">>
      invoices: T<Invoice, Omit<Invoice, "id" | "created_at">>
      projects: T<Project, Omit<Project, "id" | "created_at" | "updated_at">>
      websites: T<Website, Omit<Website, "id" | "created_at" | "updated_at">>
      leads: T<Lead, Omit<Lead, "id" | "created_at" | "updated_at">>
      automations: T<Automation, Omit<Automation, "id" | "created_at" | "updated_at">>
      workflow_executions: T<WorkflowExecution, Omit<WorkflowExecution, "id">>
      ai_requests: T<AIRequest, Omit<AIRequest, "id" | "created_at">>
      ai_usage_budgets: T<AIUsageBudget, Omit<AIUsageBudget, "id">>
      support_tickets: T<SupportTicket, Omit<SupportTicket, "id" | "created_at" | "updated_at">>
      audit_logs: T<AuditLog, Omit<AuditLog, "id" | "created_at">>
      notifications: T<Notification, Omit<Notification, "id" | "created_at">>
      integrations: T<Integration, Omit<Integration, "id" | "created_at" | "updated_at">>
      team_invites: T<TeamInvite, Omit<TeamInvite, "id" | "created_at">>
      email_logs: T<EmailLog, Omit<EmailLog, "id" | "created_at">>
      profiles: T<Profile, Omit<Profile, "created_at" | "updated_at">>
      client_invites: T<ClientInvite, Omit<ClientInvite, "id" | "created_at">>
      client_services: T<ClientService, Omit<ClientService, "id" | "created_at" | "updated_at">>
      client_projects: T<ClientProject, Omit<ClientProject, "id" | "created_at" | "updated_at">>
      support_requests: T<SupportRequest, Omit<SupportRequest, "id" | "created_at" | "updated_at">>
      client_workflows: T<ClientWorkflow, Omit<ClientWorkflow, "id" | "created_at" | "updated_at">>
      client_workflow_assignments: T<ClientWorkflowAssignment, Omit<ClientWorkflowAssignment, "id" | "created_at">>
      monitoring_checks: T<MonitoringCheck, Omit<MonitoringCheck, "id">>
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
