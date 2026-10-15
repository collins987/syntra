import { Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface SupportStatusUpdateEmailProps {
  fullName: string
  title: string
  status: "in_progress" | "resolved" | "closed"
  responseNote: string | null
  requestUrl: string
}

const COPY: Record<
  SupportStatusUpdateEmailProps["status"],
  { heading: string; body: string; cta: string }
> = {
  in_progress: {
    heading: "We're on it.",
    body: "Your request is now being worked on. We'll let you know as soon as it's resolved.",
    cta: "View request",
  },
  resolved: {
    heading: "Resolved.",
    body: "This request is complete. If you need anything else, open a new one and we'll get moving.",
    cta: "See the full note",
  },
  closed: {
    heading: "Closed.",
    body: "This request has been closed. If something comes up later, open a new one and we'll pick it back up.",
    cta: "View history",
  },
}

/**
 * One template for every status transition we notify on. The heading, body,
 * and CTA swap per status; the layout stays identical so the client sees a
 * consistent thread rather than three different-looking emails.
 */
export function SupportStatusUpdateEmail({
  fullName,
  title,
  status,
  responseNote,
  requestUrl,
}: SupportStatusUpdateEmailProps) {
  const first = fullName.split(" ")[0] ?? fullName
  const copy = COPY[status]

  return (
    <EmailLayout preview={`${copy.heading} ${title}`}>
      <Text style={text.heading}>
        {first} — {copy.heading}
      </Text>

      <Text style={text.paragraph}>{copy.body}</Text>

      <Section style={{ ...panel, marginBottom: "20px" }}>
        <Text style={text.label}>Request</Text>
        <Text style={text.value}>{title}</Text>
      </Section>

      {responseNote && (
        <Section style={{ ...panel, marginBottom: "20px" }}>
          <Text style={text.label}>Note from us</Text>
          <Text style={{ ...text.value, whiteSpace: "pre-wrap" }}>{responseNote}</Text>
        </Section>
      )}

      <a href={requestUrl} style={button}>
        {copy.cta}
      </a>

      <Text style={{ ...text.paragraph, marginTop: "20px", marginBottom: 0, color: brand.textDisabled }}>
        You can view the full thread any time in your Support dashboard.
      </Text>
    </EmailLayout>
  )
}

export default SupportStatusUpdateEmail
