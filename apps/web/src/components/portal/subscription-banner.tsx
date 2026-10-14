import Link from "next/link"
import { AlertTriangle, XCircle, PauseCircle } from "lucide-react"

export type SubscriptionStatus = "past_due" | "canceled" | "paused"

interface Props {
  status: SubscriptionStatus
  planName?: string | null
}

const CONFIG: Record<
  SubscriptionStatus,
  {
    Icon: typeof AlertTriangle
    bg: string
    border: string
    text: string
    heading: string
    body: string
    cta: string
    ctaHref: string
  }
> = {
  past_due: {
    Icon: AlertTriangle,
    bg: "bg-warning-400/10",
    border: "border-warning-400/30",
    text: "text-warning-400",
    heading: "Payment overdue",
    body: "Your last payment didn't go through. Update your billing details to keep automations and AI running.",
    cta: "Fix billing →",
    ctaHref: "/portal/billing",
  },
  canceled: {
    Icon: XCircle,
    bg: "bg-error-400/10",
    border: "border-error-400/30",
    text: "text-error-400",
    heading: "Subscription canceled",
    body: "Your subscription has ended. Your data is safe — resubscribe to restore access.",
    cta: "Resubscribe →",
    ctaHref: "/pricing",
  },
  paused: {
    Icon: PauseCircle,
    bg: "bg-bg-elevated",
    border: "border-border-subtle",
    text: "text-text-muted",
    heading: "Subscription paused",
    body: "Automations and AI agents are paused until your subscription resumes.",
    cta: "Manage billing →",
    ctaHref: "/portal/billing",
  },
}

export function SubscriptionBanner({ status, planName }: Props) {
  const c = CONFIG[status]
  const { Icon } = c

  return (
    <div
      role="alert"
      className={`mx-4 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 ${c.bg} ${c.border}`}
    >
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${c.text}`} />
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${c.text}`}>
          {c.heading}
          {planName ? ` — Syntra ${planName}` : ""}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{c.body}</p>
      </div>
      <Link
        href={c.ctaHref}
        className={`shrink-0 text-xs font-medium ${c.text} hover:underline`}
      >
        {c.cta}
      </Link>
    </div>
  )
}
