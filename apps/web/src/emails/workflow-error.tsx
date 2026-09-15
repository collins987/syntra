import { Button, Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface WorkflowErrorEmailProps {
  orgName: string
  automationName: string
  errorMessage: string
  occurredAt: string
  automationUrl: string
}

export function WorkflowErrorEmail({
  orgName,
  automationName,
  errorMessage,
  occurredAt,
  automationUrl,
}: WorkflowErrorEmailProps) {
  return (
    <EmailLayout preview={`Automation failed: ${automationName}`}>
      <Text style={{ ...text.label, color: brand.error }}>Automation failed</Text>
      <Text style={text.heading}>{automationName}</Text>

      <Text style={text.paragraph}>
        One of {orgName}&apos;s automations stopped with an error. It will not retry
        on its own — the run needs attention.
      </Text>

      <Section
        style={{
          ...panel,
          borderColor: "rgba(248,113,113,0.25)",
          marginBottom: "24px",
        }}
      >
        <Text style={text.label}>Error</Text>
        <Text
          style={{
            ...text.value,
            color: brand.error,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            fontSize: "12px",
            fontWeight: 400,
            lineHeight: "18px",
            wordBreak: "break-word",
          }}
        >
          {errorMessage}
        </Text>
        <Text style={{ ...text.label, marginTop: "14px" }}>Occurred</Text>
        <Text style={{ ...text.value, fontWeight: 400 }}>{occurredAt}</Text>
      </Section>

      <Button href={automationUrl} style={button}>
        Review automation
      </Button>
    </EmailLayout>
  )
}

export default WorkflowErrorEmail
