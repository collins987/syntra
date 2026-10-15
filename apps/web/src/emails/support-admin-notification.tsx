import { Section, Text } from "@react-email/components"
import { EmailLayout, brand, panel, text } from "./_layout"

export interface SupportAdminNotificationEmailProps {
  clientName: string
  clientEmail: string
  title: string
  description: string
  priority: string
  requestId: string
  adminUrl: string
}

const PRIORITY_TAG: Record<string, string> = {
  low: "LOW",
  normal: "NORMAL",
  high: "HIGH ·",
  urgent: "URGENT ·",
}

/**
 * Admin-facing notification sent on every new client request. Includes the
 * full description so the admin can triage without opening the panel.
 */
export function SupportAdminNotificationEmail({
  clientName,
  clientEmail,
  title,
  description,
  priority,
  requestId,
  adminUrl,
}: SupportAdminNotificationEmailProps) {
  return (
    <EmailLayout preview={`${PRIORITY_TAG[priority] ?? priority} ${clientName}: ${title}`}>
      <Text style={text.heading}>New support request</Text>
      <Text style={text.paragraph}>
        {clientName} ({clientEmail}) submitted a request.
      </Text>

      <Section style={{ ...panel, marginBottom: "16px" }}>
        <Text style={text.label}>Title</Text>
        <Text style={text.value}>{title}</Text>
      </Section>

      <Section style={{ ...panel, marginBottom: "16px" }}>
        <Text style={text.label}>Priority</Text>
        <Text style={text.value}>{priority.toUpperCase()}</Text>
      </Section>

      <Section style={{ ...panel, marginBottom: "20px" }}>
        <Text style={text.label}>Description</Text>
        <Text style={{ ...text.value, whiteSpace: "pre-wrap" }}>{description}</Text>
      </Section>

      <Text style={{ ...text.paragraph, marginBottom: 0 }}>
        <a href={adminUrl} style={{ color: brand.cyan, textDecoration: "none" }}>
          Open in admin →
        </a>
      </Text>

      <Text style={{ ...text.paragraph, marginTop: "16px", marginBottom: 0, color: brand.textDisabled }}>
        Reference: {requestId.slice(0, 8)}
      </Text>
    </EmailLayout>
  )
}

export default SupportAdminNotificationEmail
