import { Button, Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface TeamInviteEmailProps {
  orgName: string
  inviterName: string
  role: string
  acceptUrl: string
  expiresInDays: number
}

const ROLE_LABELS: Record<string, string> = {
  CLIENT_ADMIN: "Admin — full access, can manage billing and team",
  CLIENT_USER: "Member — can view and run automations",
}

export function TeamInviteEmail({
  orgName,
  inviterName,
  role,
  acceptUrl,
  expiresInDays,
}: TeamInviteEmailProps) {
  return (
    <EmailLayout preview={`${inviterName} invited you to ${orgName} on SYNTRA`}>
      <Text style={text.heading}>You&apos;ve been invited.</Text>

      <Text style={text.paragraph}>
        {inviterName} has invited you to join <strong style={{ color: brand.textPrimary }}>{orgName}</strong> on
        SYNTRA — the automation platform running their business operations.
      </Text>

      <Section style={{ ...panel, marginBottom: "24px" }}>
        <Text style={text.label}>Your role</Text>
        <Text style={text.value}>{ROLE_LABELS[role] ?? role}</Text>
      </Section>

      <Button href={acceptUrl} style={button}>
        Accept invitation
      </Button>

      <Text style={{ ...text.paragraph, marginTop: "24px", marginBottom: 0 }}>
        This invitation expires in {expiresInDays} days. If you weren&apos;t expecting it,
        you can safely ignore this email.
      </Text>
    </EmailLayout>
  )
}

export default TeamInviteEmail
