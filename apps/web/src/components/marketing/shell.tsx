import Image from "next/image"
import Link from "next/link"

// The single nav and footer for every marketing page, home included. They used
// to exist twice — once here, once inline in the home page — which is how the
// two drifted apart.
const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
]

const FOOTER_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]

export function MarketingNav() {
  return (
    <nav className="relative z-10 flex h-16 items-center justify-between border-b border-border-subtle bg-bg-base/80 px-6 backdrop-blur-sm">
      <Link href="/" className="flex items-center">
        <Image src="/logo.png" alt="SYNTRA" width={40} height={40} className="h-10 w-auto" priority />
      </Link>

      <div className="hidden items-center gap-6 text-sm text-text-muted md:flex">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="hover:text-text-primary transition-colors">
            {link.label}
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Link href="/login" className="text-sm text-text-muted hover:text-text-primary transition-colors">
          Sign in
        </Link>
        <Link
          href="/audit"
          className="flex h-8 items-center rounded-md bg-cyan-500 px-4 text-sm font-semibold text-bg-base shadow-glow-sm hover:bg-cyan-400 transition-colors"
        >
          Get free audit →
        </Link>
      </div>
    </nav>
  )
}

export function MarketingFooter() {
  return (
    <footer className="relative z-10 border-t border-border-subtle px-6 py-7">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center">
            <Image src="/logo.png" alt="SYNTRA" width={32} height={32} className="h-8 w-auto" />
          </Link>
          <span className="text-xs text-text-disabled">
            © {new Date().getFullYear()} SYNTRA LLC · Nairobi, Kenya
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-text-muted">
          {FOOTER_LINKS.map((link) => (
            <Link key={link.href} href={link.href} className="transition-colors hover:text-text-primary">
              {link.label}
            </Link>
          ))}
          <span aria-hidden="true" className="h-3 w-px bg-border-subtle" />
          <Link href="/legal/privacy" className="transition-colors hover:text-text-primary">Privacy</Link>
          <Link href="/legal/terms" className="transition-colors hover:text-text-primary">Terms</Link>
        </nav>
      </div>
    </footer>
  )
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg-base">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(30,41,53,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.25)_1px,transparent_1px)] bg-[size:40px_40px]" />
      <MarketingNav />
      <main className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  )
}
