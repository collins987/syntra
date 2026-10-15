import { Section, Text } from "@react-email/components"
import { EmailLayout, brand, panel, text } from "./_layout"

export interface SupportReceivedEmailProps {
  fullName: string
  title: string
  priority: string
  requestId: string
}

const PRIORITY_COPY: Record<string, string> = {
  low: "Low — we'll get to it in our next working window.",
  normal: "Normal — expect first response within one business day.",
  high: "High — we're treating this as a priority.",
  urgent: "Urgent — we'll acknowledge within a few hours.",
}

/**
 * Confirmation sent to the client the moment they submit a request. Sets
 * expectations on the first-response window based on priority.
 */
export function SupportReceivedEmail({
  fullName,
  title,
  priority,
  requestId,
}: SupportReceivedEmailProps) {
  const first = fullName.split(" ")[0] ?? fullName
  return (
    <EmailLayout preview={`We received your request: ${title}`}>
      <Text style={text.heading}>We&apos;ve got it, {first}.</Text>

      <Text style={text.paragraph}>
        Your request is logged in SYNTRA and we&apos;ll be in touch shortly.
        You can watch its status in the Support section of your suite.
      </Text>

      <Section style={{ ...panel, marginBottom: "20px" }}>
        <Text style={text.label}>Request</Text>
        <Text style={text.value}>{title}</Text>
      </Section>

      <Section style={{ ...panel, marginBottom: "4px" }}>
        <Text style={text.label}>Priority</Text>
        <Text style={text.value}>{PRIORITY_COPY[priority] ?? priority}</Text>
      </Section>

      <Text style={{ ...text.paragraph, marginTop: "20px", marginBottom: 0, color: brand.textDisabled }}>
        Reference: {requestId.slice(0, 8)}
      </Text>
    </EmailLayout>
  )
}

export default SupportReceivedEmail
