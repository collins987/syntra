import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"

export const brand = {
  bg: "#080A0F",
  surface: "#0D1117",
  elevated: "#111823",
  border: "#1E2935",
  cyan: "#00E5FF",
  textPrimary: "#F5F7FA",
  textMuted: "#8B97A8",
  textDisabled: "#4A5568",
  success: "#34D399",
  error: "#F87171",
  warning: "#FBBF24",
}

const styles = {
  body: {
    backgroundColor: brand.bg,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    margin: 0,
    padding: "40px 0",
  },
  container: {
    backgroundColor: brand.surface,
    border: `1px solid ${brand.border}`,
    borderRadius: "12px",
    margin: "0 auto",
    maxWidth: "520px",
    overflow: "hidden",
  },
  header: {
    borderBottom: `1px solid ${brand.border}`,
    padding: "20px 32px",
  },
  logo: {
    color: brand.textPrimary,
    fontSize: "15px",
    fontWeight: 700,
    letterSpacing: "2px",
    margin: 0,
  },
  content: { padding: "32px" },
  footer: { padding: "0 32px 28px" },
  footerText: {
    color: brand.textDisabled,
    fontSize: "11px",
    lineHeight: "18px",
    margin: 0,
  },
  footerLink: { color: brand.textMuted, textDecoration: "underline" },
  hr: { borderColor: brand.border, margin: "0 0 20px" },
}

export function EmailLayout({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={styles.header}>
            <Text style={styles.logo}>SYNTRA</Text>
          </Section>

          <Section style={styles.content}>{children}</Section>

          <Section style={styles.footer}>
            <Hr style={styles.hr} />
            <Text style={styles.footerText}>
              SYNTRA LLC · Nairobi, Kenya
              <br />
              <Link href="https://www.syntraco.tech" style={styles.footerLink}>
                syntraco.tech
              </Link>
              {"  ·  "}
              <Link
                href="https://www.syntraco.tech/portal/settings"
                style={styles.footerLink}
              >
                Notification settings
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ── Shared building blocks ───────────────────────────────────────────────────

export const text = {
  heading: {
    color: brand.textPrimary,
    fontSize: "22px",
    fontWeight: 700,
    lineHeight: "30px",
    margin: "0 0 12px",
  },
  paragraph: {
    color: brand.textMuted,
    fontSize: "14px",
    lineHeight: "22px",
    margin: "0 0 16px",
  },
  label: {
    color: brand.textDisabled,
    fontSize: "10px",
    fontWeight: 600,
    letterSpacing: "1.5px",
    margin: "0 0 4px",
    textTransform: "uppercase" as const,
  },
  value: {
    color: brand.textPrimary,
    fontSize: "14px",
    fontWeight: 600,
    margin: 0,
  },
}

export const button = {
  backgroundColor: brand.cyan,
  borderRadius: "8px",
  color: brand.bg,
  display: "inline-block",
  fontSize: "14px",
  fontWeight: 700,
  padding: "12px 28px",
  textDecoration: "none",
}

export const panel = {
  backgroundColor: brand.elevated,
  border: `1px solid ${brand.border}`,
  borderRadius: "8px",
  padding: "16px 20px",
}
