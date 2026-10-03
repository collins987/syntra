"use client"

import { useState, useTransition } from "react"

interface Member {
  id: string
  label: string
}

/** Manual assignment only — no round-robin, no auto-routing. Any org member
 *  can be assigned. See LEAD_INTELLIGENCE_V2_PLAN.md item 10. */
export function LeadAssignSelect({
  leadId,
  assignedTo,
  assignmentStatus,
  members,
}: {
  leadId: string
  assignedTo: string | null
  assignmentStatus: string
  members: Member[]
}) {
  const [value, setValue] = useState(assignedTo ?? "")
  const [status, setStatus] = useState(assignmentStatus)
  const [pending, startTransition] = useTransition()

  async function update(next: { assigned_to?: string | null; assignment_status?: string }) {
    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      })
      if (res.ok) {
        const { lead } = await res.json()
        setValue(lead.assigned_to ?? "")
        setStatus(lead.assignment_status)
      }
    })
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value || null
          update({ assigned_to: next })
        }}
        className="h-7 rounded-md border border-border-subtle bg-bg-elevated px-1.5 text-xs text-text-primary disabled:opacity-50"
      >
        <option value="">Unassigned</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>
      {value && (
        <select
          value={status}
          disabled={pending}
          onChange={(e) => update({ assignment_status: e.target.value })}
          className="h-7 rounded-md border border-border-subtle bg-bg-elevated px-1.5 text-xs text-text-muted disabled:opacity-50"
        >
          <option value="assigned">Assigned</option>
          <option value="in_progress">In progress</option>
        </select>
      )}
    </div>
  )
}
