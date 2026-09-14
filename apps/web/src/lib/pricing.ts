export interface Plan {
  id: string
  name: string
  tagline: string
  price: number
  priceId: string
  features: string[]
  cta: string
  popular?: boolean
}

export const PLANS: Plan[] = [
  {
    id: "sites",
    name: "Syntra Sites",
    tagline: "AI-powered web presence",
    price: 297,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SITES ?? "price_sites",
    features: [
      "AI-generated website in 48 hours",
      "Continuous SEO optimization",
      "Cloudflare edge hosting",
      "Monthly performance reports",
      "Lead capture automation",
      "1 client portal seat",
    ],
    cta: "Start Building",
  },
  {
    id: "flow",
    name: "Syntra Flow",
    tagline: "Autonomous workflow engine",
    price: 497,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLOW ?? "price_flow",
    features: [
      "Everything in Syntra Sites",
      "Unlimited n8n workflows",
      "CRM sync automation",
      "Email sequence automation",
      "AI lead qualification",
      "Real-time execution dashboard",
      "5 portal seats",
    ],
    cta: "Automate Everything",
    popular: true,
  },
  {
    id: "os",
    name: "Syntra OS",
    tagline: "Complete AI operating system",
    price: 997,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_OS ?? "price_os",
    features: [
      "Everything in Syntra Flow",
      "Dedicated AI agents (Ava, Max, Leo)",
      "Custom AI model configuration",
      "Priority 24/7 support",
      "White-glove onboarding",
      "99.9% uptime SLA",
      "Unlimited portal seats",
    ],
    cta: "Run the Full Stack",
  },
]
