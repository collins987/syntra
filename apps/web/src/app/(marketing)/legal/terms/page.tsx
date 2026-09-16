import Link from "next/link"
import { MarketingShell } from "@/components/marketing/shell"

export default function TermsPage() {
  const updated = "15 September 2026"

  return (
    <MarketingShell>
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-cyan-500">
            Legal
          </div>
          <h1 className="mb-2 text-3xl font-bold text-text-primary">Terms of Service</h1>
          <p className="mb-10 text-sm text-text-disabled">Last updated: {updated}</p>

          <div className="space-y-8 text-text-muted">

            <p className="text-sm leading-relaxed">
              These Terms of Service (&quot;Terms&quot;) govern your access to and use of SYNTRA LLC&apos;s
              website at{" "}
              <a href="https://www.syntraco.tech" className="text-cyan-500 hover:underline">
                www.syntraco.tech
              </a>{" "}
              and the SYNTRA client portal (&quot;Services&quot;). By creating an account or purchasing a
              subscription, you agree to these Terms. If you do not agree, do not use the Services.
            </p>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">1. Services</h2>
              <p className="text-sm leading-relaxed">
                SYNTRA provides AI-powered business automation services including website management
                (Syntra Sites), workflow automation (Syntra Flow), marketing automation
                (Syntra Marketing), and the full-suite package (Syntra OS). Lead management and AI
                agents are included as capabilities within every plan rather than sold separately.
                The specific deliverables and scope for each plan are described on our{" "}
                <Link href="/services" className="text-cyan-500 hover:underline">Services</Link> and{" "}
                <Link href="/pricing" className="text-cyan-500 hover:underline">Pricing</Link> pages.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">2. Account registration</h2>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>You must provide accurate, complete, and current information when registering.</li>
                <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
                <li>You must be at least 18 years old and have authority to enter into contracts on behalf of your business.</li>
                <li>You are responsible for all activity that occurs under your account.</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">3. Subscriptions and payment</h2>

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-primary">3.1 Billing</h3>
              <p className="text-sm leading-relaxed">
                Subscriptions are billed monthly in advance. You may pay by credit/debit card (via Stripe)
                or M-Pesa (via IntaSend, Kenya only). Prices are displayed on the pricing page in both
                USD and KES. KES prices are calculated at the prevailing exchange rate and may change
                with 30 days&apos; notice.
              </p>

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-primary">3.2 Renewals</h3>
              <p className="text-sm leading-relaxed">
                Card subscriptions renew automatically each month. M-Pesa subscriptions require manual
                renewal via the billing portal. We will send a reminder 5 days before your subscription
                expires.
              </p>

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-primary">3.3 Cancellation</h3>
              <p className="text-sm leading-relaxed">
                You may cancel at any time from your billing portal. Cancellation takes effect at the
                end of the current billing period. We do not offer refunds for partial months.
              </p>

              <h3 className="mb-2 mt-4 text-sm font-semibold text-text-primary">3.4 Failed payments</h3>
              <p className="text-sm leading-relaxed">
                If a payment fails, we will attempt to notify you by email. Access to the portal and
                active automations will be suspended after 7 days of non-payment. Your data is retained
                for 30 days after suspension before deletion.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">4. Acceptable use</h2>
              <p className="mb-3 text-sm leading-relaxed">You agree not to use SYNTRA services to:</p>
              <ul className="ml-4 list-disc space-y-1 text-sm leading-relaxed">
                <li>Send unsolicited bulk email (spam) or engage in deceptive marketing practices</li>
                <li>Violate any applicable law or regulation, including data protection laws</li>
                <li>Infringe third-party intellectual property rights</li>
                <li>Attempt to gain unauthorised access to other accounts, systems, or networks</li>
                <li>Interfere with the integrity or performance of the platform</li>
                <li>Resell or sublicense SYNTRA services without written permission</li>
              </ul>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">5. Intellectual property</h2>
              <p className="mb-3 text-sm leading-relaxed">
                <strong className="text-text-primary">Your data:</strong> You retain all rights to content
                and data you upload to or generate through SYNTRA. You grant us a limited licence to store
                and process this data solely to deliver our services.
              </p>
              <p className="text-sm leading-relaxed">
                <strong className="text-text-primary">Our platform:</strong> SYNTRA LLC owns all intellectual
                property rights in the platform, software, and documentation. Nothing in these Terms transfers
                ownership of our IP to you.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">6. Service availability</h2>
              <p className="text-sm leading-relaxed">
                We target 99.9% uptime for the client portal and automation infrastructure. Planned
                maintenance will be communicated at least 24 hours in advance. We are not liable for
                downtime caused by third-party infrastructure (Supabase, Cloudflare, IntaSend, Stripe)
                or events outside our reasonable control.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">7. Limitation of liability</h2>
              <p className="text-sm leading-relaxed">
                To the maximum extent permitted by law, SYNTRA LLC&apos;s aggregate liability to you for
                any claim arising out of or relating to these Terms or the Services shall not exceed
                the total amount you paid us in the 3 months preceding the claim. We are not liable
                for indirect, incidental, special, consequential, or punitive damages, including lost
                profits or data loss.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">8. Disclaimer of warranties</h2>
              <p className="text-sm leading-relaxed">
                The Services are provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
                express or implied. We do not warrant that the Services will be error-free, uninterrupted,
                or that AI-generated outputs will be accurate, complete, or fit for any particular purpose.
                You are responsible for reviewing and validating all outputs before relying on them.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">9. Termination</h2>
              <p className="text-sm leading-relaxed">
                We may suspend or terminate your account immediately if you breach these Terms, fail
                to pay, or engage in conduct that we reasonably believe is harmful to other users or
                the platform. Upon termination, your right to use the Services ceases. You may request
                an export of your data within 30 days of termination.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">10. Governing law</h2>
              <p className="text-sm leading-relaxed">
                These Terms are governed by the laws of Kenya. Any disputes shall be resolved in the
                courts of Nairobi, Kenya. If any provision of these Terms is found unenforceable, the
                remaining provisions continue in full force.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">11. Changes to these Terms</h2>
              <p className="text-sm leading-relaxed">
                We may update these Terms from time to time. For material changes, we will notify you
                by email at least 14 days before the change takes effect. Your continued use of the
                Services after that date constitutes acceptance of the updated Terms.
              </p>
            </div>

            <div>
              <h2 className="mb-3 text-base font-semibold text-text-primary">12. Contact</h2>
              <p className="text-sm leading-relaxed">
                For questions about these Terms, contact us at:
              </p>
              <address className="mt-2 not-italic text-sm leading-relaxed">
                SYNTRA LLC<br />
                Nairobi, Kenya<br />
                <a href="mailto:hello@syntraco.tech" className="text-cyan-500 hover:underline">
                  hello@syntraco.tech
                </a>
              </address>
            </div>
          </div>

          <div className="mt-12 flex gap-4 border-t border-border-subtle pt-6 text-sm text-text-disabled">
            <Link href="/legal/privacy" className="hover:text-text-muted transition-colors">
              Privacy Policy →
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
