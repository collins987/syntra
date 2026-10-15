import { sendEmail, APP_URL } from "@/lib/resend"
import { SupportReceivedEmail } from "@/emails/support-received"
import { SupportAdminNotificationEmail } from "@/emails/support-admin-notification"
import { SupportStatusUpdateEmail } from "@/emails/support-status-update"
import type { SupportPriority } from "@syntra/db"

/**
 * Confirmation email sent to the client the moment their support request lands.
 */
export function sendSupportReceivedEmail(args: {
  to: string
  fullName: string
  title: string
  priority: SupportPriority
  requestId: string
}): Promise<{ ok: boolean; id: string | null }> {
  return sendEmail({
    to: args.to,
    subject: `We've got your request: ${args.title}`,
    template: "support-received",
    react: SupportReceivedEmail({
      fullName: args.fullName,
      title: args.title,
      priority: args.priority,
      requestId: args.requestId,
    }),
    orgId: null,
  })
}

/**
 * Admin notification email. `to` is read from env; we fall back to
 * SUPPORT_ADMIN_EMAIL first, then RESEND_FROM_EMAIL's address, then a
 * hard-coded internal address so a misconfigured env never silently drops
 * the signal — a missing admin email is a configuration bug the admin
 * should see loudly in the local resend log, not a quiet no-op.
 */
export function sendSupportAdminNotificationEmail(args: {
  clientName: string
  clientEmail: string
  title: string
  description: string
  priority: SupportPriority
  requestId: string
}): Promise<{ ok: boolean; id: string | null }> {
  const to =
    process.env.SUPPORT_ADMIN_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    "hello@syntraco.tech"
  const adminUrl = `${APP_URL}/admin/support#${args.requestId}`
  return sendEmail({
    to,
    subject: `[${args.priority.toUpperCase()}] ${args.clientName}: ${args.title}`,
    template: "support-admin-notification",
    react: SupportAdminNotificationEmail({
      clientName: args.clientName,
      clientEmail: args.clientEmail,
      title: args.title,
      description: args.description,
      priority: args.priority,
      requestId: args.requestId,
      adminUrl,
    }),
    orgId: null,
    replyTo: args.clientEmail,
  })
}

/**
 * Status-change email sent to the client. One wrapper for in_progress,
 * resolved and closed — the template picks the right copy from `status`.
 */
export function sendSupportStatusUpdateEmail(args: {
  to: string
  fullName: string
  title: string
  status: "in_progress" | "resolved" | "closed"
  responseNote: string | null
  requestId: string
}): Promise<{ ok: boolean; id: string | null }> {
  const requestUrl = `${APP_URL}/portal/support#${args.requestId}`
  const subject =
    args.status === "resolved"
      ? `Resolved: ${args.title}`
      : args.status === "closed"
        ? `Closed: ${args.title}`
        : `Update: ${args.title}`
  return sendEmail({
    to: args.to,
    subject,
    template: `support-${args.status}`,
    react: SupportStatusUpdateEmail({
      fullName: args.fullName,
      title: args.title,
      status: args.status,
      responseNote: args.responseNote,
      requestUrl,
    }),
    orgId: null,
  })
}
