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

// Database shape for Supabase client typing
export interface Database {
  public: {
    Tables: {
      organizations: { Row: Organization; Insert: Omit<Organization, "id" | "created_at" | "updated_at">; Update: Partial<Organization> }
      organization_members: { Row: OrganizationMember; Insert: Omit<OrganizationMember, "id" | "created_at">; Update: Partial<OrganizationMember> }
      subscriptions: { Row: Subscription; Insert: Omit<Subscription, "id" | "created_at" | "updated_at">; Update: Partial<Subscription> }
      projects: { Row: Project; Insert: Omit<Project, "id" | "created_at" | "updated_at">; Update: Partial<Project> }
      websites: { Row: Website; Insert: Omit<Website, "id" | "created_at" | "updated_at">; Update: Partial<Website> }
      leads: { Row: Lead; Insert: Omit<Lead, "id" | "created_at" | "updated_at">; Update: Partial<Lead> }
      automations: { Row: Automation; Insert: Omit<Automation, "id" | "created_at" | "updated_at">; Update: Partial<Automation> }
      workflow_executions: { Row: WorkflowExecution; Insert: Omit<WorkflowExecution, "id">; Update: Partial<WorkflowExecution> }
      ai_requests: { Row: AIRequest; Insert: Omit<AIRequest, "id" | "created_at">; Update: Partial<AIRequest> }
      ai_usage_budgets: { Row: AIUsageBudget; Insert: Omit<AIUsageBudget, "id">; Update: Partial<AIUsageBudget> }
      support_tickets: { Row: SupportTicket; Insert: Omit<SupportTicket, "id" | "created_at" | "updated_at">; Update: Partial<SupportTicket> }
      audit_logs: { Row: AuditLog; Insert: Omit<AuditLog, "id" | "created_at">; Update: Partial<AuditLog> }
      notifications: { Row: Notification; Insert: Omit<Notification, "id" | "created_at">; Update: Partial<Notification> }
    }
  }
}
