import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = { title: "Sign-in error" }

type ErrorReason = "expired" | "invalid" | "unauthorised"

const COPY: Record<ErrorReason, { title: string; body: string }> = {
  expired: {
    title: "Link expired",
    body: "This link has expired. Ask us to send a fresh one — the new link will arrive within a minute.",
  },
  invalid: {
    title: "Invalid link",
    body: "This link isn't recognised. It may have been used already or copied incorrectly.",
  },
  unauthorised: {
    title: "Access denied",
    body: "You don't have permission to view that page.",
  },
}

interface Props {
  searchParams: Promise<{ reason?: string }>
}

export default async function AuthErrorPage({ searchParams }: Props) {
  const { reason } = await searchParams
  const key = (reason as ErrorReason | undefined) ?? "invalid"
  const copy = COPY[key] ?? COPY.invalid

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,41,53,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.3)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-mark.png"
            alt="SYNTRA"
            width={40}
            height={40}
            className="h-10 w-10"
            priority
          />
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-wide text-text-primary">
              SYNTRA
            </h1>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-modal text-center">
          <h2 className="text-base font-semibold text-text-primary">{copy.title}</h2>
          <p className="mt-2 text-sm text-text-muted">{copy.body}</p>
          <Link
            href="/login"
            className="mt-5 inline-flex items-center rounded-lg border border-border-subtle px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition"
          >
            Return to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
