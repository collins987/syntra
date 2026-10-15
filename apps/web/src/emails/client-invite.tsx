import { Button, Section, Text } from "@react-email/components"
import { EmailLayout, brand, button, panel, text } from "./_layout"

export interface ClientInviteEmailProps {
  fullName: string
  activateUrl: string
  expiresInMinutes: number
}

/**
 * Personal-account onboarding invite. Sent once per client when the admin
 * creates their account. Distinct from TeamInviteEmail, which invites an
 * existing user to an existing organisation.
 */
export function ClientInviteEmail({
  fullName,
  activateUrl,
  expiresInMinutes,
}: ClientInviteEmailProps) {
  return (
    <EmailLayout preview={`Activate your SYNTRA account, ${fullName}`}>
      <Text style={text.heading}>Welcome to SYNTRA.</Text>

      <Text style={text.paragraph}>
        Hi {fullName}, your SYNTRA client account is ready. Activate it to see
        the services we&apos;re building for you, submit change requests, and
        track everything in one place.
      </Text>

      <Section style={{ ...panel, marginBottom: "24px" }}>
        <Text style={text.label}>What happens next</Text>
        <Text style={text.value}>
          Click the button below to set your password and sign in.
        </Text>
      </Section>

      <Button href={activateUrl} style={button}>
        Activate your account
      </Button>

      <Text style={{ ...text.paragraph, marginTop: "24px", marginBottom: 0 }}>
        This link expires in {expiresInMinutes} minutes for your security.
        If it has already expired, ask us to send a fresh one — we&apos;ll do
        it in a moment.
      </Text>

      <Text style={{ ...text.paragraph, marginTop: "16px", marginBottom: 0, color: brand.textDisabled }}>
        If you weren&apos;t expecting this email, you can safely ignore it.
      </Text>
    </EmailLayout>
  )
}

export default ClientInviteEmail
