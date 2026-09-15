import Image from "next/image"
import Link from "next/link"

const NAV_LINKS = [
  { href: "/services", label: "Services" },
  { href: "/pricing", label: "Pricing" },
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
    <footer className="relative z-10 border-t border-border-subtle px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-8 md:grid-cols-4">
          <div>
            <Link href="/" className="mb-3 flex items-center">
              <Image src="/logo.png" alt="SYNTRA" width={32} height={32} className="h-8 w-auto" />
            </Link>
            <p className="text-xs text-text-disabled leading-relaxed">
              The AI Operating System for Modern Business. Build. Automate. Scale.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
              Products
            </p>
            <ul className="space-y-2 text-sm text-text-muted">
              {["Syntra Sites", "Syntra Flow", "Syntra Marketing", "Syntra Leads", "Syntra AI", "Syntra OS"].map((p) => (
                <li key={p}>
                  <Link href="/services" className="hover:text-text-primary transition-colors">{p}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
              Company
            </p>
            <ul className="space-y-2 text-sm text-text-muted">
              <li><Link href="/about" className="hover:text-text-primary transition-colors">About</Link></li>
              <li><Link href="/services" className="hover:text-text-primary transition-colors">Services</Link></li>
              <li><Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-text-primary transition-colors">Contact</Link></li>
              <li><Link href="/audit" className="hover:text-text-primary transition-colors">Free Audit</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-text-disabled">
              Get in Touch
            </p>
            <ul className="space-y-2 text-sm text-text-muted">
              <li>
                <a href="mailto:hello@syntraco.tech" className="hover:text-text-primary transition-colors">
                  hello@syntraco.tech
                </a>
              </li>
              <li>
                <a href="mailto:support@syntraco.tech" className="hover:text-text-primary transition-colors">
                  support@syntraco.tech
                </a>
              </li>
              <li className="pt-1 text-xs text-text-disabled">Nairobi, Kenya</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-border-subtle pt-6 text-xs text-text-disabled sm:flex-row">
          <span>© {new Date().getFullYear()} SYNTRA LLC. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-text-muted transition-colors">Privacy Policy</Link>
            <Link href="/legal/terms" className="hover:text-text-muted transition-colors">Terms of Service</Link>
          </div>
        </div>
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
