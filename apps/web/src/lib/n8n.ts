// n8n REST API v1 client for self-hosted instance (Azure)
// Env vars required: N8N_BASE_URL (e.g. https://n8n.syntraco.tech), N8N_API_KEY

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
  tags?: Array<{ id: string; name: string }>
  createdAt: string
  updatedAt: string
}

export interface N8nExecution {
  id: string
  workflowId: string
  /** n8n uses "success" | "error" | "waiting" | "running" */
  status: string
  startedAt: string
  stoppedAt?: string | null
  data?: {
    resultData?: {
      error?: { message: string; stack?: string }
    }
  }
}

export interface N8nListResponse<T> {
  data: T[]
  nextCursor?: string | null
}

function getConfig() {
  const baseUrl = process.env.N8N_BASE_URL
  const apiKey = process.env.N8N_API_KEY
  if (!baseUrl || !apiKey) {
    throw new Error("N8N_BASE_URL and N8N_API_KEY must be set")
  }
  return { baseUrl: baseUrl.replace(/\/$/, ""), apiKey }
}

async function n8nFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const { baseUrl, apiKey } = getConfig()
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    ...options,
    headers: {
      "X-N8N-API-KEY": apiKey,
      "Content-Type": "application/json",
      ...options?.headers,
    },
    // n8n on Azure may be behind a slow cold start — generous timeout
    signal: options?.signal ?? AbortSignal.timeout(15_000),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`n8n API ${path}: ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`)
  }
  return res.json() as Promise<T>
}

export const n8n = {
  /** Fetch all workflows (active and inactive) */
  workflows(): Promise<N8nListResponse<N8nWorkflow>> {
    return n8nFetch("/workflows?limit=250")
  },

  /** Fetch a single workflow */
  workflow(id: string): Promise<N8nWorkflow> {
    return n8nFetch(`/workflows/${id}`)
  },

  /** Fetch recent executions, optionally filtered by workflow */
  executions(workflowId?: string, limit = 100): Promise<N8nListResponse<N8nExecution>> {
    const params = new URLSearchParams({ limit: String(limit) })
    if (workflowId) params.set("workflowId", workflowId)
    return n8nFetch(`/executions?${params}`)
  },

  /** Activate or deactivate a workflow */
  setActive(id: string, active: boolean): Promise<N8nWorkflow> {
    return n8nFetch(`/workflows/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" })
  },

  /** Check if the instance is reachable (health probe) */
  async ping(): Promise<boolean> {
    try {
      await n8nFetch("/workflows?limit=1")
      return true
    } catch {
      return false
    }
  },
}

/** Map n8n execution status → our WorkflowExecutionStatus */
export function toExecutionStatus(n8nStatus: string): "running" | "completed" | "failed" | "retrying" {
  switch (n8nStatus) {
    case "success": return "completed"
    case "error": return "failed"
    case "waiting": return "retrying"
    default: return "running"
  }
}
