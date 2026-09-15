import { Button, Column, Row, Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface WelcomeEmailProps {
  orgName: string
  planName: string
  dashboardUrl: string
}

export function WelcomeEmail({ orgName, planName, dashboardUrl }: WelcomeEmailProps) {
  return (
    <EmailLayout preview={`${orgName} is live on SYNTRA`}>
      <Text style={text.heading}>Your system is live.</Text>

      <Text style={text.paragraph}>
        {orgName} is set up and running on SYNTRA. Your command center is ready —
        every automation, lead and report lands there from now on.
      </Text>

      <Section style={{ ...panel, marginBottom: "24px" }}>
        <Row>
          <Column>
            <Text style={text.label}>Organisation</Text>
            <Text style={text.value}>{orgName}</Text>
          </Column>
          <Column>
            <Text style={text.label}>Plan</Text>
            <Text style={{ ...text.value, color: brand.cyan }}>{planName}</Text>
          </Column>
        </Row>
      </Section>

      <Text style={{ ...text.label, marginBottom: "10px" }}>What happens next</Text>
      <Text style={text.paragraph}>
        1. We review your onboarding answers within one business day.
        <br />
        2. Your first automations are configured and switched on.
        <br />
        3. You get a weekly report showing exactly what ran and what it saved you.
      </Text>

      <Button href={dashboardUrl} style={button}>
        Open your dashboard
      </Button>

      <Text style={{ ...text.paragraph, marginTop: "24px", marginBottom: 0 }}>
        Questions? Reply to this email — it reaches a human.
      </Text>
    </EmailLayout>
  )
}

export default WelcomeEmail
