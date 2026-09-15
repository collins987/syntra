import { Button, Column, Row, Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface WeeklyReportEmailProps {
  orgName: string
  periodLabel: string
  automationRuns: number
  leadsGenerated: number
  aiTasks: number
  successRate: string
  hoursSaved: string
  dashboardUrl: string
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Column style={{ paddingRight: "12px", width: "50%" }}>
      <Text style={text.label}>{label}</Text>
      <Text
        style={{
          color: accent ? brand.cyan : brand.textPrimary,
          fontSize: "24px",
          fontWeight: 700,
          margin: "0 0 16px",
        }}
      >
        {value}
      </Text>
    </Column>
  )
}

export function WeeklyReportEmail({
  orgName,
  periodLabel,
  automationRuns,
  leadsGenerated,
  aiTasks,
  successRate,
  hoursSaved,
  dashboardUrl,
}: WeeklyReportEmailProps) {
  return (
    <EmailLayout preview={`${orgName} — ${automationRuns} automations ran this week`}>
      <Text style={{ ...text.label, marginBottom: "6px" }}>{periodLabel}</Text>
      <Text style={text.heading}>Your week in numbers.</Text>

      <Text style={text.paragraph}>
        Here&apos;s what ran autonomously for {orgName} while you focused on the business.
      </Text>

      <Section style={{ ...panel, marginBottom: "24px" }}>
        <Row>
          <Stat label="Automations run" value={automationRuns.toLocaleString()} accent />
          <Stat label="Leads generated" value={leadsGenerated.toLocaleString()} />
        </Row>
        <Row>
          <Stat label="AI tasks completed" value={aiTasks.toLocaleString()} />
          <Stat label="Success rate" value={successRate} />
        </Row>
        <Row>
          <Column>
            <Text style={text.label}>Estimated time saved</Text>
            <Text
              style={{
                color: brand.success,
                fontSize: "24px",
                fontWeight: 700,
                margin: 0,
              }}
            >
              {hoursSaved}
            </Text>
          </Column>
        </Row>
      </Section>

      <Button href={dashboardUrl} style={button}>
        View full breakdown
      </Button>
    </EmailLayout>
  )
}

export default WeeklyReportEmail
