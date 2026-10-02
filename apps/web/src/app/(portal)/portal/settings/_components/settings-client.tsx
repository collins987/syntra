"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Eye, EyeOff, Mail, Shield, Users, Building2,
  Trash2, UserPlus, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PLANS } from "@/lib/pricing"
import { PageShell, PageHeader, PageBody } from "@/components/portal/primitives"

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserData {
  id: string
  name: string | null
  email: string
}

interface OrgData {
  id: string
  name: string
  slug: string
  plan: string
}

interface Member {
  id: string
  userId: string
  role: string
  name: string | null
  email: string | null
  joinedAt: string
  isYou: boolean
}

interface PendingInvite {
  id: string
  email: string
  role: string
  expires_at: string
}

interface Props {
  user: UserData
  org: OrgData | null
  members: Member[]
  invites: PendingInvite[]
  role: string
}

type Tab = "profile" | "security" | "team" | "org"

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "profile", label: "Profile", icon: <Mail className="h-4 w-4" /> },
  { id: "security", label: "Security", icon: <Shield className="h-4 w-4" /> },
  { id: "team", label: "Team", icon: <Users className="h-4 w-4" /> },
  { id: "org", label: "Organization", icon: <Building2 className="h-4 w-4" /> },
]

const PLAN_LABELS: Record<string, string> = Object.fromEntries(
  PLANS.map((p) => [p.id, p.name])
)

const ROLE_LABELS: Record<string, string> = {
  CLIENT_ADMIN: "Admin", CLIENT_USER: "Member",
}

// ─── Shared ───────────────────────────────────────────────────────────────────

function Banner({ type, msg }: { type: "success" | "error"; msg: string }) {
  return (
    <div className={`flex items-center gap-2 rounded-lg px-4 py-3 text-sm border ${
      type === "success"
        ? "bg-success-500/10 text-success-400 border-success-500/20"
        : "bg-error-500/10 text-error-400 border-error-500/20"
    }`}>
      {type === "success"
        ? <CheckCircle2 className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {msg}
    </div>
  )
}

const input = "w-full rounded-lg border border-border-subtle bg-bg-elevated px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:border-cyan-500 focus:outline-none"
const btn = "flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-bg-base transition hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed"

// ─── Profile Tab ──────────────────────────────────────────────────────────────

function ProfileTab({ user }: { user: UserData }) {
  const router = useRouter()
  const [name, setName] = useState(user.name ?? "")
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function save() {
    setLoading(true)
    setBanner(null)
    const { error } = await createClient().auth.updateUser({ data: { name } })
    setLoading(false)
    if (error) {
      setBanner({ type: "error", msg: error.message })
    } else {
      setBanner({ type: "success", msg: "Profile updated." })
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Profile</h2>
        <p className="mt-0.5 text-sm text-text-muted">Your display name across the platform.</p>
      </div>
      {banner && <Banner {...banner} />}
      <div className="space-y-4 rounded-xl border border-border-subtle bg-bg-surface px-6 py-5">
        <div className="space-y-1.5">
          <label htmlFor="profile-name" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Display name</label>
          <input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={input} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="profile-email" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Email</label>
          <input id="profile-email" value={user.email} disabled className={`${input} cursor-not-allowed opacity-50`} />
          <p className="text-xs text-text-disabled">Email changes require verification — contact support.</p>
        </div>
        <button onClick={save} disabled={loading || name === (user.name ?? "")} className={btn}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save changes
        </button>
      </div>
    </div>
  )
}

// ─── Security Tab ─────────────────────────────────────────────────────────────

function SecurityTab() {
  const [pw, setPw] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function update() {
    if (pw.length < 8) { setBanner({ type: "error", msg: "Password must be at least 8 characters." }); return }
    if (pw !== confirm) { setBanner({ type: "error", msg: "Passwords do not match." }); return }
    setLoading(true)
    setBanner(null)
    const { error } = await createClient().auth.updateUser({ password: pw })
    setLoading(false)
    if (error) {
      setBanner({ type: "error", msg: error.message })
    } else {
      setPw(""); setConfirm("")
      setBanner({ type: "success", msg: "Password updated successfully." })
    }
  }

  const strength = pw.length === 0 ? 0 : pw.length < 8 ? 1 : pw.length < 12 ? 2 : 3
  const strengthColors = ["", "bg-error-500", "bg-warning-400", "bg-success-500"]
  const strengthLabels = ["", "Weak", "Good", "Strong"]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Security</h2>
        <p className="mt-0.5 text-sm text-text-muted">Change your account password.</p>
      </div>
      {banner && <Banner {...banner} />}
      <div className="space-y-4 rounded-xl border border-border-subtle bg-bg-surface px-6 py-5">
        <div className="space-y-1.5">
          <label htmlFor="security-new-password" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">New password</label>
          <div className="relative">
            <input id="security-new-password" type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Minimum 8 characters" className={`${input} pr-10`} />
            <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {pw.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5">
                {[1, 2, 3].map((n) => (
                  <div key={n} className={`h-1 w-8 rounded-full transition-colors ${strength >= n ? strengthColors[strength] : "bg-border-subtle"}`} />
                ))}
              </div>
              <span className="text-xs text-text-muted">{strengthLabels[strength]}</span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="security-confirm-password" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Confirm password</label>
          <input id="security-confirm-password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat new password" className={input} />
        </div>
        <button onClick={update} disabled={loading || !pw || !confirm} className={btn}>
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Update password
        </button>
      </div>
    </div>
  )
}

// ─── Team Tab ─────────────────────────────────────────────────────────────────

function TeamTab({ members: init, invites: initInv, role }: { members: Member[]; invites: PendingInvite[]; role: string }) {
  const isAdmin = role === "CLIENT_ADMIN"
  const [members, setMembers] = useState(init)
  const [invites, setInvites] = useState(initInv)
  const [email, setEmail] = useState("")
  const [inviteRole, setInviteRole] = useState("CLIENT_USER")
  const [inviting, setInviting] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function invite() {
    if (!email.trim()) return
    setInviting(true); setBanner(null)
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: inviteRole }),
    })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) {
      setBanner({ type: "error", msg: data.error ?? "Failed to send invitation." })
    } else {
      setEmail("")
      setBanner({ type: "success", msg: `Invitation sent to ${email.trim()}.` })
      if (data.invite) setInvites((p) => [data.invite as PendingInvite, ...p])
    }
  }

  async function remove(id: string) {
    setRemoving(id)
    const res = await fetch("/api/team/remove", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id }),
    })
    setRemoving(null)
    if (res.ok) {
      setMembers((p) => p.filter((m) => m.id !== id))
    } else {
      const d = await res.json()
      setBanner({ type: "error", msg: d.error ?? "Failed to remove member." })
    }
  }

  async function cancelInvite(id: string) {
    const res = await fetch(`/api/team/invite?id=${id}`, { method: "DELETE" })
    if (res.ok) setInvites((p) => p.filter((i) => i.id !== id))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Team</h2>
        <p className="mt-0.5 text-sm text-text-muted">{members.length} member{members.length !== 1 ? "s" : ""}{invites.length > 0 ? ` · ${invites.length} pending` : ""}</p>
      </div>
      {banner && <Banner {...banner} />}

      <div className="rounded-xl border border-border-subtle bg-bg-surface divide-y divide-border-subtle/50">
        {members.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400 text-xs font-bold uppercase">
                {(m.name ?? m.email ?? "?")[0]}
              </div>
              <div>
                <p className="text-sm font-medium text-text-primary">
                  {m.name ?? m.email ?? "Unknown user"}
                  {m.isYou && <span className="ml-2 text-xs text-text-disabled">(you)</span>}
                </p>
                {m.name && <p className="text-xs text-text-muted">{m.email}</p>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-md border border-border-subtle px-2.5 py-0.5 text-[11px] text-text-secondary">
                {ROLE_LABELS[m.role] ?? m.role}
              </span>
              {isAdmin && !m.isYou && (
                <button onClick={() => remove(m.id)} disabled={removing === m.id} className="text-text-muted hover:text-error-400 transition disabled:opacity-40" title="Remove member">
                  {removing === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {invites.length > 0 && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Pending</p>
          <div className="rounded-xl border border-border-subtle bg-bg-surface divide-y divide-border-subtle/50">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm text-text-primary">{inv.email}</p>
                  <p className="text-xs text-text-muted">{ROLE_LABELS[inv.role] ?? inv.role} · expires {new Date(inv.expires_at).toLocaleDateString()}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => cancelInvite(inv.id)} className="text-xs text-text-muted hover:text-error-400 transition">Cancel</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-text-muted">Invite member</p>
          <div className="rounded-xl border border-border-subtle bg-bg-surface px-5 py-4 space-y-3">
            <div className="flex gap-3">
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void invite()} placeholder="colleague@company.com" className={`${input} flex-1`} />
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="rounded-lg border border-border-subtle bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none">
                <option value="CLIENT_USER">Member</option>
                <option value="CLIENT_ADMIN">Admin</option>
              </select>
            </div>
            <button onClick={() => void invite()} disabled={inviting || !email.trim()} className={btn}>
              {inviting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}
              Send invitation
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Organization Tab ─────────────────────────────────────────────────────────

function OrgTab({ org, role }: { org: OrgData; role: string }) {
  const isAdmin = role === "CLIENT_ADMIN"
  const [name, setName] = useState(org.name)
  const [loading, setLoading] = useState(false)
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null)

  async function save() {
    setLoading(true); setBanner(null)
    const res = await fetch("/api/org/update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    setLoading(false)
    setBanner(res.ok
      ? { type: "success", msg: "Organization updated." }
      : { type: "error", msg: data.error ?? "Failed to update." }
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-text-primary">Organization</h2>
        <p className="mt-0.5 text-sm text-text-muted">Manage your organization settings.</p>
      </div>
      {banner && <Banner {...banner} />}
      <div className="space-y-4 rounded-xl border border-border-subtle bg-bg-surface px-6 py-5">
        <div className="space-y-1.5">
          <label htmlFor="org-name" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Organization name</label>
          <input id="org-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} className={`${input} ${!isAdmin ? "cursor-not-allowed opacity-50" : ""}`} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="org-slug" className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Slug</label>
          <input id="org-slug" value={org.slug} disabled className={`${input} cursor-not-allowed opacity-50`} />
          <p className="text-xs text-text-disabled">Slugs cannot be changed after creation.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-[11px] font-semibold uppercase tracking-widest text-text-muted">Plan</label>
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
              {PLAN_LABELS[org.plan] ?? org.plan}
            </span>
            <a href="/portal/billing" className="text-xs text-text-muted underline hover:text-text-primary">Manage billing →</a>
          </div>
        </div>
        {isAdmin && (
          <button onClick={save} disabled={loading || name === org.name} className={btn}>
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Save changes
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function SettingsClient({ user, org, members, invites, role }: Props) {
  const [tab, setTab] = useState<Tab>("profile")

  return (
    <PageShell>
      <PageHeader title="Settings" subtitle="Account, team and organization." />
      <PageBody>
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-10">
          {/* A horizontal scrollable row below `sm` — the fixed w-40 side nav
              this reverts to above `sm` left only ~170px for content (forms,
              team rows) on a phone, which is what made every tab feel
              compressed rather than just the nav itself. */}
          <nav className="flex gap-1.5 overflow-x-auto pb-1 sm:w-40 sm:shrink-0 sm:flex-col sm:space-y-0.5 sm:overflow-visible sm:pb-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition sm:w-full ${
                  tab === t.id
                    ? "bg-cyan-500/10 text-cyan-400 font-medium"
                    : "text-text-muted hover:text-text-primary hover:bg-white/5"
                }`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1 max-w-lg">
            {tab === "profile" && <ProfileTab user={user} />}
            {tab === "security" && <SecurityTab />}
            {tab === "team" && <TeamTab members={members} invites={invites} role={role} />}
            {tab === "org" && org && <OrgTab org={org} role={role} />}
          </div>
        </div>
      </PageBody>
    </PageShell>
  )
}
