import { Resend } from "resend"
import * as Sentry from "@sentry/nextjs"
import { createServiceClient } from "@/lib/supabase/service"

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null

const FROM = process.env.RESEND_FROM_EMAIL ?? "SYNTRA <hello@syntraco.tech>"

interface SendEmailOptions {
  to: string
  subject: string
  /** Template identifier stored in email_logs, e.g. "welcome" */
  template: string
  react: React.ReactElement
  orgId?: string | null
  replyTo?: string
}

/**
 * Sends a transactional email and records the attempt in email_logs.
 *
 * Never throws: a failed email must not roll back the business action that
 * triggered it (onboarding, invites, payments). Failures go to Sentry and are
 * written to email_logs with status 'failed' so support can see them.
 */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<{ ok: boolean; id: string | null }> {
  const { to, subject, template, react, orgId = null, replyTo } = opts

  if (!resend) {
    // Local dev without RESEND_API_KEY — log and no-op rather than crash.
    console.warn(`[email] RESEND_API_KEY not set, skipped "${template}" to ${to}`)
    return { ok: false, id: null }
  }

  let resendId: string | null = null
  let errorMessage: string | null = null

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      subject,
      react,
      ...(replyTo ? { replyTo } : {}),
    })
    if (error) throw new Error(error.message)
    resendId = data?.id ?? null
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Unknown email error"
    Sentry.captureException(err, { tags: { template }, extra: { to, subject } })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = createServiceClient() as any
    await db.from("email_logs").insert({
      org_id: orgId,
      to_email: to,
      subject,
      template,
      resend_id: resendId,
      status: errorMessage ? "failed" : "sent",
      error: errorMessage,
    })
  } catch (logErr) {
    Sentry.captureException(logErr, { tags: { template, stage: "email_log" } })
  }

  return { ok: !errorMessage, id: resendId }
}

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.syntraco.tech"
