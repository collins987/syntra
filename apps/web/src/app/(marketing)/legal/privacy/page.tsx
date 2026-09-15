import Link from "next/link"
import { MarketingShell } from "@/components/marketing/shell"

export default function PrivacyPage() {
  const updated = "15 September 2026"

  return (
    <MarketingShell>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            Legal
          </div>
          <h1 className="mb-2 text-3xl font-bold text-text-primary">Privacy Policy</h1>
          <p className="mb-10 text-sm text-text-disabled">Last updated: {updated}</p>

          <div className="prose prose-sm max-w-none space-y-8 text-text-muted [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-text-primary [&_h3]:mt-5 [&_h3]:mb-2 [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-text-primary">

            <p className="text-sm leading-relaxed">
              SYNTRA LLC (&quot;SYNTRA&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the website at{" "}
              <a href="https://www.syntraco.tech" className="text-cyan-500 hover:underline">
                www.syntraco.tech
              </a>{" "}
              and the SYNTRA client portal. This Privacy Policy explains how we collect, use, and protect your
              personal information when you use our services.
            </p>

            <div>
              <h2>1. Information we collect</h2>

              <h3>1.1 Information you provide directly</h3>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>Name and email address when you create an account or submit the free audit form</li>
                <li>Business name, industry, and company size when you complete onboarding</li>
                <li>Phone number when you choose to pay via M-Pesa</li>
                <li>Billing information processed securely by our payment providers (see Section 3)</li>
                <li>Messages and enquiries you send to hello@syntraco.tech or support@syntraco.tech</li>
              </ul>

              <h3>1.2 Information collected automatically</h3>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>IP address and approximate geolocation</li>
                <li>Browser type, operating system, and device type</li>
                <li>Pages visited, time on site, and referring URL</li>
                <li>Portal usage: features accessed, automations run, API calls made</li>
              </ul>
            </div>

            <div>
              <h2>2. How we use your information</h2>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>Provide, operate, and improve the SYNTRA platform and services</li>
                <li>Process payments and send receipts and invoices</li>
                <li>Send transactional emails (account confirmation, password reset, billing notifications)</li>
                <li>Respond to support requests and enquiries</li>
                <li>Analyse aggregate usage patterns to improve the product</li>
                <li>Comply with legal obligations</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed">
                We do not sell your personal data to third parties. We do not use your data for advertising
                networks or data brokers.
              </p>
            </div>

            <div>
              <h2>3. Third-party services</h2>
              <p className="mb-3 text-sm">
                We use the following third-party processors to deliver our services. Each has its own privacy policy.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle text-left text-xs font-semibold uppercase tracking-wide text-text-disabled">
                      <th className="pb-2 pr-4">Service</th>
                      <th className="pb-2 pr-4">Purpose</th>
                      <th className="pb-2">Data shared</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {[
                      { name: "Supabase", purpose: "Database & authentication", data: "Email, hashed password, business profile" },
                      { name: "Stripe", purpose: "Card payment processing", data: "Card details (never stored by us), email, billing address" },
                      { name: "IntaSend", purpose: "M-Pesa payment processing", data: "Phone number, name, payment amount" },
                      { name: "Cloudflare", purpose: "Hosting, CDN, DDoS protection", data: "IP address (anonymised logs)" },
                    ].map((row) => (
                      <tr key={row.name}>
                        <td className="py-2.5 pr-4 font-medium text-text-primary">{row.name}</td>
                        <td className="py-2.5 pr-4 text-text-muted">{row.purpose}</td>
                        <td className="py-2.5 text-text-muted">{row.data}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h2>4. Data storage and security</h2>
              <p className="text-sm leading-relaxed">
                Your data is stored on Supabase infrastructure hosted in the EU (Frankfurt). We use
                row-level security (RLS) policies so that each organisation can only access its own data.
                All data in transit is encrypted with TLS 1.2+. We follow OWASP security best practices
                and conduct regular dependency audits.
              </p>
            </div>

            <div>
              <h2>5. Data retention</h2>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>Active account data: retained for the duration of your subscription</li>
                <li>Billing records: retained for 7 years as required by Kenyan tax law</li>
                <li>Audit logs: retained for 90 days</li>
                <li>Deleted accounts: all personal data removed within 30 days of deletion request</li>
              </ul>
            </div>

            <div>
              <h2>6. Your rights</h2>
              <p className="mb-3 text-sm leading-relaxed">
                Under the Kenya Data Protection Act (2019) and applicable privacy regulations, you have the right to:
              </p>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>Access the personal data we hold about you</li>
                <li>Correct inaccurate or incomplete data</li>
                <li>Request deletion of your data (&quot;right to erasure&quot;)</li>
                <li>Object to or restrict certain processing activities</li>
                <li>Export your data in a machine-readable format (data portability)</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed">
                To exercise any of these rights, email{" "}
                <a href="mailto:hello@syntraco.tech" className="text-cyan-500 hover:underline">
                  hello@syntraco.tech
                </a>
                . We will respond within 30 days.
              </p>
            </div>

            <div>
              <h2>7. Cookies</h2>
              <p className="text-sm leading-relaxed">
                We use only session cookies required for authentication and a Supabase auth cookie
                to keep you logged in. We do not use advertising cookies or third-party trackers.
                You can disable cookies in your browser, but doing so will prevent you from staying
                logged in to the client portal.
              </p>
            </div>

            <div>
              <h2>8. Children&apos;s privacy</h2>
              <p className="text-sm leading-relaxed">
                Our services are intended for businesses and individuals aged 18 and over.
                We do not knowingly collect personal data from children under 18.
              </p>
            </div>

            <div>
              <h2>9. Changes to this policy</h2>
              <p className="text-sm leading-relaxed">
                We may update this Privacy Policy from time to time. When we do, we will update
                the &quot;Last updated&quot; date at the top of this page and, for material changes,
                notify you by email.
              </p>
            </div>

            <div>
              <h2>10. Contact</h2>
              <p className="text-sm leading-relaxed">
                For privacy-related questions or requests, contact us at:
              </p>
              <address className="mt-2 not-italic text-sm leading-relaxed text-text-muted">
                SYNTRA LLC<br />
                Nairobi, Kenya<br />
                <a href="mailto:hello@syntraco.tech" className="text-cyan-500 hover:underline">
                  hello@syntraco.tech
                </a>
              </address>
            </div>
          </div>

          <div className="mt-12 flex gap-4 border-t border-border-subtle pt-6 text-sm text-text-disabled">
            <Link href="/legal/terms" className="hover:text-text-muted transition-colors">
              Terms of Service →
            </Link>
            <Link href="/contact" className="hover:text-text-muted transition-colors">
              Contact us →
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  )
}
