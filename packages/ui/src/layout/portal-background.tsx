// The same navy-to-black recipe as the marketing site's SiteBackground
// (apps/web/src/components/marketing/shell.tsx) — same base gradient and hue,
// so the portal reads as the same product rather than a different app bolted
// onto the same login page. Dialled down from there deliberately: this is a
// working screen with dense tables and numbers, not a hero. One restrained
// glow, no diagonal beams, no grid — those earn their keep on a marketing
// page selling a feeling and cost readability here.
//
// If the marketing recipe's colour stops ever change, mirror the change here
// too — kept as a separate component (rather than shared across packages)
// because apps/web and packages/ui are different workspace packages.
export function PortalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(174deg,#0B1020_0%,#0A0E1B_30%,#090C14_60%,#07090F_82%,#06080D_100%)]" />

      {/* One glow, a third of the marketing page's strength, anchored top-right
          so it sits behind the header/KPI row rather than under a data table. */}
      <div className="absolute inset-0 bg-[radial-gradient(55%_45%_at_78%_0%,rgba(0,229,255,0.05)_0%,rgba(0,229,255,0.025)_35%,rgba(0,229,255,0.008)_60%,rgba(0,229,255,0)_100%)]" />

      <div className="bg-dither absolute inset-0" />
    </div>
  )
}
