"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

import type { Profile } from "@syntra/db"

interface Props {
  profile: Profile
}

/**
 * Personal-account profile editor. Lets a client update their own name,
 * phone, company name, and avatar URL. Email and status are deliberately
 * read-only — email changes go through Supabase's verification flow (future
 * phase) and status is platform-controlled per the self-update trigger in
 * migration 016.
 */
export function ProfileSettings({ profile }: Props) {
  const router = useRouter()
  const [fullName, setFullName] = useState(profile.full_name)
  const [phone, setPhone] = useState(profile.phone ?? "")
  const [companyName, setCompanyName] = useState(profile.company_name ?? "")
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "")
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("saving")
    setError(null)

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        company_name: companyName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      }),
    })

    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as { error?: string }
      setError(payload.error ?? "Failed to save.")
      setStatus("error")
      return
    }

    setStatus("saved")
    router.refresh()
    setTimeout(() => setStatus("idle"), 2000)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary">Settings</h1>
        <p className="mt-1 text-sm text-text-muted">
          Your profile — this is what we use to reach you.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-xl space-y-5 rounded-xl border border-border-subtle bg-bg-elevated p-6"
      >
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-text-secondary">Email</label>
          <input
            type="email"
            value={profile.email}
            readOnly
            className="flex h-9 w-full rounded-md border border-border bg-bg-base px-3 text-sm text-text-muted"
          />
          <p className="text-[11px] text-text-disabled">
            To change your email, contact us from Support.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="full_name" className="block text-sm font-medium text-text-secondary">
            Full name
          </label>
          <input
            id="full_name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="phone" className="block text-sm font-medium text-text-secondary">
            Phone
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Optional"
            className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="company_name" className="block text-sm font-medium text-text-secondary">
            Company
          </label>
          <input
            id="company_name"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Optional"
            className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="avatar_url" className="block text-sm font-medium text-text-secondary">
            Avatar URL
          </label>
          <input
            id="avatar_url"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://… (optional)"
            className="flex h-9 w-full rounded-md border border-border bg-bg-elevated px-3 text-sm text-text-primary focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        {error && (
          <div className="rounded-md border border-error-500/20 bg-error-500/10 px-3 py-2 text-sm text-error-400">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={status === "saving"}
            className="flex h-9 items-center justify-center rounded-md bg-cyan-500 px-5 text-sm font-semibold text-bg-base shadow-glow-sm transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : "Save changes"}
          </button>
          {status === "saved" && (
            <span className="text-xs text-success-400">Saved</span>
          )}
        </div>
      </form>
    </div>
  )
}
