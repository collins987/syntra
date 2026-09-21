import type { Metadata } from "next"
import Image from "next/image"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Sign In" }

interface Props {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { redirectTo } = await searchParams
  // An invitee who doesn't have an account yet needs the same destination
  // carried through to signup — otherwise it's silently dropped here and
  // they land in fresh onboarding instead of the org they were invited to.
  const signupHref = redirectTo ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}` : "/signup"

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      {/* Background grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,41,53,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.3)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo-mark.png" alt="SYNTRA" width={40} height={40} className="h-10 w-10" priority />
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-wide text-text-primary">SYNTRA</h1>
            <p className="text-sm text-text-muted">Sign in to your account</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-modal">
          <LoginForm />
        </div>

        <p className="mt-4 text-center text-xs text-text-disabled">
          Don&apos;t have an account?{" "}
          <a href={signupHref} className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Get started
          </a>
        </p>
      </div>
    </div>
  )
}
