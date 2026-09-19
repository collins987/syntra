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
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 overflow-hidden">
      {/* Deep navy settling into black. Extra stops rather than two: a long
          two-stop gradient across a whole viewport quantises into visible
          bands on a dark screen. */}
      <div className="absolute inset-0 bg-[linear-gradient(174deg,#0B1020_0%,#0A0E1B_30%,#090C14_60%,#07090F_82%,#06080D_100%)]" />

      {/* Glows. Every stop fades to the SAME hue at zero alpha, never to the
          `transparent` keyword — `transparent` means transparent *black*, so
          fading to it drags a grey fringe through the colour. That is what
          made these read as badly mixed. The stepped falloff is also smoother
          than a single stop, which bands. */}
      <div className="absolute inset-0 bg-[radial-gradient(75%_65%_at_72%_26%,rgba(0,229,255,0.15)_0%,rgba(0,229,255,0.10)_20%,rgba(0,229,255,0.055)_40%,rgba(0,229,255,0.022)_62%,rgba(0,229,255,0.006)_82%,rgba(0,229,255,0)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(58%_48%_at_92%_0%,rgba(124,58,237,0.16)_0%,rgba(124,58,237,0.09)_28%,rgba(124,58,237,0.035)_55%,rgba(124,58,237,0.01)_78%,rgba(124,58,237,0)_100%)]" />

      {/* Two restrained diagonal beams, same zero-alpha rule */}
      <div className="absolute -left-[10%] top-[20%] h-px w-[62%] rotate-[-17deg] bg-[linear-gradient(90deg,rgba(0,229,255,0)_0%,rgba(0,229,255,0.26)_50%,rgba(0,229,255,0)_100%)] blur-[2px]" />
      <div className="absolute -top-[20%] right-[-8%] h-[140%] w-[30%] rotate-[14deg] bg-[linear-gradient(180deg,rgba(0,229,255,0.06)_0%,rgba(0,229,255,0.025)_45%,rgba(0,229,255,0)_100%)] blur-3xl" />

      {/* Vignette, eased through a middle stop so there is no visible ring */}
      <div className="absolute inset-0 bg-[radial-gradient(125%_95%_at_58%_32%,rgba(4,6,11,0)_42%,rgba(4,6,11,0.18)_64%,rgba(4,6,11,0.5)_82%,rgba(4,6,11,0.82)_100%)]" />

      {/* Dither. Wide, low-contrast gradients quantise to 8-bit and band
          regardless of how many stops they have; a faint noise layer breaks
          the steps up. Invisible on its own, does the whole job. */}
      <div className="bg-dither absolute inset-0" />
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
