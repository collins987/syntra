// Single source of truth for plan identity, pricing, and Stripe/IntaSend mapping.
// Anything that needs to know about a plan imports from here — do not redefine
// prices or plan IDs anywhere else.

export type PlanId = "sites" | "flow" | "marketing" | "os"

export const PLAN_IDS: readonly PlanId[] = ["sites", "flow", "marketing", "os"]

export interface Plan {
  id: PlanId
  name: string
  /**
   * One-word role in the SYNTRA model — Build / Operate / Grow. Shown as a card
   * eyebrow so the three services read as one system, not three unrelated products.
   */
  category: string
  /**
   * The single description shown on every card surface. 12–15 words, plain
   * English, no stack names. One field on purpose: two description fields is
   * how the cards got bulky before.
   */
  summary: string
  priceUsd: number
  priceKes: number
  priceId: string
  features: string[]
  cta: string
  /** Pill text shown on the plan card. */
  badge?: string
  /** Visual emphasis — reserved for the plan we want every client to reach. */
  highlight?: boolean
}

/**
 * Reads a whole-shilling price from the environment.
 *
 * The whole string must be digits. `parseInt` alone is not safe here: it stops
 * at the first character it cannot read and returns what it got, so a value
 * entered as "90,700" becomes 90 — a number that passes a finite-and-positive
 * check while being wrong by three orders of magnitude, and gets shown to a
 * customer as the price. Falling back to the known-good figure is always
 * better than advertising a wrong one.
 */
function kes(envVar: string | undefined, fallback: number): number {
  const raw = envVar?.trim()
  if (!raw) return fallback

  if (!/^\d+$/.test(raw)) {
    console.warn(
      `[pricing] Ignoring malformed KES price "${raw}" — expected digits only, e.g. 90700. Using ${fallback}.`
    )
    return fallback
  }

  const parsed = Number(raw)
  return parsed > 0 ? parsed : fallback
}

export const PLANS: Plan[] = [
  {
    id: "sites",
    name: "Syntra Sites",
    category: "Build",
    summary: "Built, hosted and improved every month — you never have to touch it.",
    priceUsd: 297,
    priceKes: kes(process.env.NEXT_PUBLIC_INTASEND_PRICE_SITES_KES, 38700),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SITES ?? "price_sites",
    features: [
      "Custom website live in 48 hours",
      "Copy written to convert, not just describe",
      "Monthly SEO and layout improvements",
      "Global CDN hosting — 99.9% uptime",
      "Contact forms and lead capture built in",
      "1 portal seat",
    ],
    cta: "Start Building",
  },
  {
    id: "flow",
    name: "Syntra Flow",
    category: "Operate",
    summary: "We rebuild the work your team repeats by hand so it runs itself.",
    priceUsd: 497,
    priceKes: kes(process.env.NEXT_PUBLIC_INTASEND_PRICE_FLOW_KES, 64700),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_FLOW ?? "price_flow",
    features: [
      "Everything in Syntra Sites",
      "We map your manual processes, then automate them",
      "Connects the tools you already use",
      "Invoices, follow-ups and handoffs run themselves",
      "Failure alerts before you notice a problem",
      "5 portal seats",
    ],
    cta: "Automate Everything",
    badge: "Most popular",
  },
  {
    id: "marketing",
    name: "Syntra Marketing",
    category: "Grow",
    summary: "Content, campaigns and follow-up that keep running so your pipeline never goes quiet.",
    priceUsd: 697,
    priceKes: kes(process.env.NEXT_PUBLIC_INTASEND_PRICE_MARKETING_KES, 90700),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MARKETING ?? "price_marketing",
    features: [
      "Everything in Syntra Flow",
      "Content written in your brand voice",
      "Social posts scheduled and published for you",
      "Email newsletters and follow-up sequences",
      "Campaign performance reported monthly",
      "You approve before anything goes out",
    ],
    cta: "Grow On Autopilot",
  },
  {
    id: "os",
    name: "Syntra OS",
    category: "Everything",
    summary: "Sites, Flow and Marketing running together, with a team that owns the outcome.",
    priceUsd: 997,
    priceKes: kes(process.env.NEXT_PUBLIC_INTASEND_PRICE_OS_KES, 129700),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_OS ?? "price_os",
    features: [
      "Sites, Flow and Marketing combined",
      "Your AI team at full capability",
      "Dedicated implementation manager",
      "Weekly strategy calls",
      "Priority support — 2-hour response",
      "Unlimited portal seats",
    ],
    cta: "Run the Full Stack",
    badge: "Best value",
    highlight: true,
  },
]

// Sold as part of every plan — never purchasable on their own.
export interface Capability {
  id: string
  name: string
  summary: string
}

export const CAPABILITIES: Capability[] = [
  {
    id: "lead-intelligence",
    name: "Lead Intelligence",
    summary: "Every enquiry scored and routed the moment it arrives, then followed up automatically.",
  },
  {
    id: "ai-agents",
    name: "AI Agents",
    summary: "Ava writes, Max watches operations, Leo reads your numbers. They propose, you approve.",
  },
]

// ── Lookups ──────────────────────────────────────────────────────────────────

export function isPlanId(value: string): value is PlanId {
  return (PLAN_IDS as readonly string[]).includes(value)
}

export function getPlan(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export const KES_AMOUNTS: Record<PlanId, number> = PLANS.reduce(
  (acc, p) => ({ ...acc, [p.id]: p.priceKes }),
  {} as Record<PlanId, number>
)

/** Resolves a Stripe price ID back to a plan. Returns null when unrecognised. */
export function planFromStripePriceId(priceId: string): PlanId | null {
  if (!priceId) return null
  return PLANS.find((p) => p.priceId && p.priceId === priceId)?.id ?? null
}
