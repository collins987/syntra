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

export interface Lead {
  id: string
  org_id: string
  email: string
  name: string | null
  company: string | null
  source: string | null
  score: number
  tier: LeadTier | null
  audit_answers: Record<string, unknown>
  audit_report: Record<string, unknown>
  crm_id: string | null
  status: string
  metadata: Record<string, unknown>
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
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
