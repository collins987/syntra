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

/**
 * The page's lighting: deep navy falling to black, a masked grid for texture,
 * restrained cyan and violet glows, diagonal beams, and a vignette that keeps
 * the edges dark. Fixed to the viewport so the lighting stays put while the
 * content scrolls through it, rather than repeating per section.
 */
export function SiteBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0">
      {/* Deep navy settling into black */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#0A0E17_0%,#080A0F_55%,#06080E_100%)]" />

      {/* Grid texture, faded toward the centre so it never competes with
          whatever is being read */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,53,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,53,0.28)_1px,transparent_1px)] bg-[size:40px_40px] [-webkit-mask-image:radial-gradient(75%_65%_at_60%_45%,transparent_5%,black_85%)] [mask-image:radial-gradient(75%_65%_at_60%_45%,transparent_5%,black_85%)]" />

      {/* Main cyan glow */}
      <div className="absolute inset-0 bg-[radial-gradient(58%_55%_at_70%_32%,rgba(0,229,255,0.13),transparent_72%)]" />
      {/* Violet counterweight, for depth */}
      <div className="absolute inset-0 bg-[radial-gradient(42%_42%_at_88%_8%,rgba(124,58,237,0.11),transparent_70%)]" />

      {/* Diagonal beams — two thin, one broad and soft */}
      <div className="absolute -left-[8%] top-[18%] h-px w-[58%] rotate-[-17deg] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent blur-[1.5px]" />
      <div className="absolute left-[12%] top-[62%] h-px w-[46%] rotate-[-17deg] bg-gradient-to-r from-transparent via-cyan-300/[0.16] to-transparent blur-[1.5px]" />
      <div className="absolute -top-[15%] right-[-6%] h-[130%] w-[26%] rotate-[14deg] bg-gradient-to-b from-cyan-500/[0.06] via-cyan-500/[0.03] to-transparent blur-3xl" />

      {/* Vignette: edges stay dark and atmospheric */}
      <div className="absolute inset-0 bg-[radial-gradient(115%_85%_at_55%_38%,transparent_50%,rgba(4,6,11,0.9)_100%)]" />
    </div>
  )
}

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
      <SiteBackground />
      <MarketingNav />
      <main className="relative z-10">{children}</main>
      <MarketingFooter />
    </div>
  )
}
