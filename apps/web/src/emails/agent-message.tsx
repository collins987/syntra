import { Section, Text } from "@react-email/components"
import { EmailLayout, brand, panel, text } from "./_layout"

export interface AgentMessageEmailProps {
  subject: string
  body: string
  orgName: string
}

export function AgentMessageEmail({ subject, body, orgName }: AgentMessageEmailProps) {
  return (
    <EmailLayout preview={subject}>
      <Text style={text.heading}>{subject}</Text>

      {body.split(/\n{2,}/).map((paragraph, i) => (
        <Text key={i} style={{ ...text.paragraph, whiteSpace: "pre-wrap" }}>
          {paragraph}
        </Text>
      ))}

      <Section style={{ ...panel, marginTop: "24px" }}>
        <Text
          style={{
            ...text.paragraph,
            color: brand.textDisabled,
            fontSize: "12px",
            margin: 0,
          }}
        >
          Sent by SYNTRA on behalf of {orgName}.
        </Text>
      </Section>
    </EmailLayout>
  )
}

export default AgentMessageEmail
