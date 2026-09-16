"use client"

import { useState } from "react"
import { RefreshCw, CheckCircle2, AlertCircle } from "lucide-react"

type State = "idle" | "loading" | "ok" | "err"

export function SyncButton() {
  const [state, setState] = useState<State>("idle")
  const [detail, setDetail] = useState("")

  async function sync() {
    setState("loading")
    setDetail("")
    try {
      const res = await fetch("/api/n8n/sync", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        setState("ok")
        setDetail(data.synced != null ? `${data.synced as number} workflow${data.synced !== 1 ? "s" : ""} synced` : "Done")
      } else {
        setState("err")
        setDetail((data.error as string | undefined) ?? "Sync failed")
      }
    } catch {
      setState("err")
      setDetail("Could not reach sync endpoint")
    }
    // Reset to idle after 4 s
    setTimeout(() => setState("idle"), 4000)
  }

  return (
    <div className="flex items-center gap-2">
      {state === "ok" && (
        <span className="flex items-center gap-1.5 text-xs text-success-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {detail}
        </span>
      )}
      {state === "err" && (
        <span className="flex items-center gap-1.5 text-xs text-error-400">
          <AlertCircle className="h-3.5 w-3.5" />
          {detail}
        </span>
      )}
      <button
        onClick={() => void sync()}
        disabled={state === "loading"}
        title="Pull latest workflows from n8n"
        className="flex h-9 items-center gap-2 rounded-xl border border-border-subtle bg-bg-elevated px-4 text-sm text-text-secondary transition hover:border-border-strong hover:text-text-primary disabled:opacity-40"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${state === "loading" ? "animate-spin" : ""}`} />
        {state === "loading" ? "Syncing…" : "Sync from n8n"}
      </button>
    </div>
  )
}
