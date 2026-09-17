import type { Metadata } from "next"
import Image from "next/image"
import { SignupForm } from "./signup-form"

export const metadata: Metadata = { title: "Create Account" }

export default function SignupPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-base p-4">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(30,41,53,0.3)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.3)_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image src="/logo-mark.png" alt="SYNTRA" width={40} height={40} className="h-10 w-10" priority />
          <div className="text-center">
            <h1 className="text-lg font-semibold tracking-wide text-text-primary">SYNTRA</h1>
            <p className="text-sm text-text-muted">Create your account</p>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-bg-surface p-6 shadow-modal">
          <SignupForm />
        </div>

        <p className="mt-4 text-center text-xs text-text-disabled">
          Already have an account?{" "}
          <a href="/login" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}
