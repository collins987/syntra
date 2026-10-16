import { sendEmail, APP_URL } from "@/lib/resend"
import { MonitoringAlertEmail } from "@/emails/monitoring-alert"

/**
 * Admin notification when a project's monitoring check flips to down or
 * degraded. Reads SUPPORT_ADMIN_EMAIL for the destination (same env var the
 * support flow uses) so the admin has one inbox for all operational alerts.
 */
export function sendMonitoringAlertEmail(args: {
  clientName: string
  projectName: string
  url: string
  status: "down" | "degraded"
  error: string | null
  responseTimeMs: number | null
}): Promise<{ ok: boolean; id: string | null }> {
  const to =
    process.env.SUPPORT_ADMIN_EMAIL ||
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    "hello@syntraco.tech"
  const subject =
    args.status === "down"
      ? `[DOWN] ${args.clientName} / ${args.projectName}`
      : `[DEGRADED] ${args.clientName} / ${args.projectName}`
  return sendEmail({
    to,
    subject,
    template: `monitoring-${args.status}`,
    react: MonitoringAlertEmail({
      clientName: args.clientName,
      projectName: args.projectName,
      url: args.url,
      status: args.status,
      error: args.error,
      responseTimeMs: args.responseTimeMs,
      adminUrl: `${APP_URL}/admin/system`,
    }),
    orgId: null,
  })
}
