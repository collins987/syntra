import { Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface MonitoringAlertEmailProps {
  clientName: string
  projectName: string
  url: string
  status: "down" | "degraded"
  error: string | null
  responseTimeMs: number | null
  adminUrl: string
}

/**
 * Admin-only alert when a monitoring check reports a client's project as
 * down or degraded. Fires on the up → down transition only; a long outage
 * does not re-email on every tick, which the cron runner enforces.
 */
export function MonitoringAlertEmail({
  clientName,
  projectName,
  url,
  status,
  error,
  responseTimeMs,
  adminUrl,
}: MonitoringAlertEmailProps) {
  const heading = status === "down" ? "A client site is down." : "A client site is degraded."
  const subheading =
    status === "down"
      ? `${clientName}'s ${projectName} is not responding.`
      : `${clientName}'s ${projectName} is slow to respond.`

  return (
    <EmailLayout preview={`${clientName} / ${projectName} — ${status}`}>
      <Text style={text.heading}>{heading}</Text>
      <Text style={text.paragraph}>{subheading}</Text>

      <Section style={{ ...panel, marginBottom: "16px" }}>
        <Text style={text.label}>URL</Text>
        <Text style={text.value}>{url}</Text>
      </Section>

      {error && (
        <Section style={{ ...panel, marginBottom: "16px" }}>
          <Text style={text.label}>Error</Text>
          <Text style={text.value}>{error}</Text>
        </Section>
      )}

      {typeof responseTimeMs === "number" && (
        <Section style={{ ...panel, marginBottom: "20px" }}>
          <Text style={text.label}>Response time</Text>
          <Text style={text.value}>{responseTimeMs} ms</Text>
        </Section>
      )}

      <a href={adminUrl} style={button}>
        Open the system dashboard
      </a>

      <Text style={{ ...text.paragraph, marginTop: "20px", marginBottom: 0, color: brand.textDisabled }}>
        Follow-up alerts stop until the site recovers and goes down again — no spam.
      </Text>
    </EmailLayout>
  )
}

export default MonitoringAlertEmail
