// Next.js wraps every page under this route group in a Suspense boundary
// with this as the fallback, so it shows only in the content area — the
// sidebar and topbar (rendered by the layout, one level up) stay mounted and
// don't flash. A generic skeleton rather than a per-page one: the shape here
// (header bar + card grid) approximates most portal pages well enough to be
// a placeholder, not a design.
//
// Static, not shimmering — consistent with the rest of the portal, which has
// no decorative motion. It communicates "this is a placeholder" through
// shape alone rather than needing to move to prove it isn't frozen.
export default function PortalLoading() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <div className="h-6 w-48 rounded-md bg-bg-elevated" />
        <div className="mt-2.5 h-4 w-72 rounded-md bg-bg-elevated" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-xl border border-border-subtle bg-bg-surface" />
        ))}
      </div>

      <div className="mt-4 h-64 rounded-xl border border-border-subtle bg-bg-surface" />
    </div>
  )
}
