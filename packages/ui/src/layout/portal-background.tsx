// A flat, neutral dark surface for the working area of the app — no colour
// glow, no beams, no grid. The marketing site earns that kind of atmosphere
// selling a feeling; a screen full of tables and numbers just needs to be
// quiet. The gradient exists only so a single flat fill doesn't band on a
// dark screen — extra stops rather than two, plus a faint dither.
export function PortalBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(174deg,#0B1020_0%,#0A0E1B_30%,#090C14_60%,#07090F_82%,#06080D_100%)]" />
      <div className="bg-dither absolute inset-0" />
    </div>
  )
}
