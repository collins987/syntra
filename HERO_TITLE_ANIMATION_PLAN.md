# Hero Title Animation — Implementation Plan

| | |
|---|---|
| **Where** | `apps/web/src/app/(marketing)/page.tsx` — the `<h1>` in the Hero section |
| **Goal** | The headline reveals letter by letter on load, reading as modern/professional (think Linear, Vercel, Stripe) rather than playful |
| **Dependencies to add** | **None.** Pure CSS + one small client component. No animation library needed for a single headline. |

---

## 1. Current state

```tsx
<h1 className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-text-primary md:text-7xl">
  BUILD THE
  <br />
  <span className="text-cyan-400">AUTONOMOUS</span>
  <br />
  BUSINESS.
</h1>
```

Static, renders instantly. `page.tsx` is a server component today (no `"use client"`, no hooks) — the plan keeps everything else server-rendered and isolates the animation to one small client island, which is the right scope for a marketing page (best for LCP/SEO to keep the rest static).

---

## 2. Design decisions

| Decision | Choice | Why |
|---|---|---|
| Reveal unit | **Letter-by-letter**, per your ask, but grouped by word so a stagger never visually splits a word mid-air oddly — spaces don't animate, they're just gaps | Matches the request while still reading cleanly |
| Motion | Opacity `0→1` + `translateY(0.4em → 0)` + a **subtle blur** `blur(4px) → blur(0)` per letter | This "blur-in" is the specific detail that reads as modern/premium (used by Linear, Framer's own site, Arc) rather than a generic fade or bounce |
| Stagger | ~16ms between letters, ~90ms between words | Fast enough that a 3-line, ~25-character headline finishes in well under 1s — a slow letter-by-letter reveal reads as a gimmick, not professional |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` ("ease-out-expo") | Snappy settle, no bounce/overshoot — the professional tell |
| Colour | The cyan "AUTONOMOUS" span keeps its colour per letter; no colour animation | Keeps it about motion, not a colour gimmick |
| Trigger | On mount, after a ~100ms delay (lets the page paint first so the animation doesn't fight initial paint/layout) | Avoids animating during layout thrash |
| Reduced motion | `prefers-reduced-motion: reduce` → text appears instantly, no animation at all | Accessibility requirement, not optional |
| Repeat | **Once per page load.** Does not replay on scroll-into-view (it's already in view on load) and does not replay on route return within the same session (see §5) | A hero that re-animates every time you tab back is the single most common way this pattern turns from "premium" to "annoying" |
| Layout stability | The full text is present in the DOM and laid out from the first paint — only opacity/transform/filter animate, nothing that affects layout (`width`, `height`, `display`) | Zero CLS |
| Accessibility of the split | Real text lives in one `aria-label` on the wrapping element; the per-letter `<span>`s are `aria-hidden="true"` | Splitting text into 20+ spans is how screen readers end up spelling out "B-U-I-L-D" — must not happen |

---

## 3. Implementation

### 3.1 New component: `src/components/marketing/animated-headline.tsx`

```tsx
"use client"

import { useEffect, useState, type ReactNode } from "react"

interface Segment {
  text: string
  className?: string
}

/**
 * Reveals a multi-line, multi-colour headline letter by letter on mount.
 * The real text is always present (aria-label); the animated spans are
 * decorative and hidden from assistive tech. Respects reduced motion.
 */
export function AnimatedHeadline({
  lines,
  className,
}: {
  /** Each line is an array of coloured segments, e.g. [{text:"BUILD THE"}] */
  lines: Segment[][]
  className?: string
}) {
  const [play, setPlay] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return // stays in the CSS "settled" state — see globals.css
    const t = setTimeout(() => setPlay(true), 100)
    return () => clearTimeout(t)
  }, [])

  const fullText = lines.map((line) => line.map((s) => s.text).join("")).join(" ")

  let globalIndex = 0

  return (
    <h1 className={className} aria-label={fullText}>
      <span aria-hidden="true" data-play={play || undefined}>
        {lines.map((line, li) => (
          <span key={li} className="block">
            {line.map((seg, si) => (
              <span key={si} className={seg.className}>
                {seg.text.split(/(\s+)/).map((word, wi) =>
                  /\s+/.test(word) ? (
                    <span key={wi}>{word}</span>
                  ) : (
                    <span key={wi} className="inline-block">
                      {[...word].map((ch, ci) => {
                        const i = globalIndex++
                        return (
                          <span
                            key={ci}
                            className="headline-char"
                            style={{ "--i": i } as React.CSSProperties}
                          >
                            {ch}
                          </span>
                        )
                      })}
                    </span>
                  )
                )}
              </span>
            ))}
          </span>
        ))}
      </span>
    </h1>
  )
}
```

### 3.2 CSS: append to `src/app/globals.css`

```css
/* Hero headline letter reveal. Starts in the settled (visible) state so
   content is never invisible if JS is slow/blocked — only [data-play]
   opts into the animated entrance. */
.headline-char {
  display: inline-block;
  opacity: 1;
  transform: translateY(0);
  filter: blur(0);
}

[data-play] .headline-char {
  opacity: 0;
  transform: translateY(0.4em);
  filter: blur(4px);
  animation: headline-reveal 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * 16ms);
}

@keyframes headline-reveal {
  to {
    opacity: 1;
    transform: translateY(0);
    filter: blur(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-play] .headline-char {
    animation: none;
    opacity: 1;
    transform: none;
    filter: none;
  }
}
```

Why "settled by default, animated only via `[data-play]`": if JavaScript is slow, disabled, or the component hasn't hydrated yet, the headline is fully visible and correctly laid out — never a blank hero. This is the same reasoning as the repo's own `[hidden]` convention, applied here.

### 3.3 Usage in `page.tsx`

```tsx
import { AnimatedHeadline } from "@/components/marketing/animated-headline"

// ...

<AnimatedHeadline
  className="max-w-4xl text-5xl font-bold leading-tight tracking-tight text-text-primary md:text-7xl"
  lines={[
    [{ text: "BUILD THE" }],
    [{ text: "AUTONOMOUS", className: "text-cyan-400" }],
    [{ text: "BUSINESS." }],
  ]}
/>
```

`page.tsx` itself stays a server component — only `AnimatedHeadline` is `"use client"`. Everything else on the page (nav, pricing cards, footer) is unaffected and ships zero extra client JS.

---

## 4. Why not a library

`framer-motion`/`motion` isn't in the project today. For one headline, pulling in ~30-50KB gzipped of animation runtime is disproportionate — the CSS approach above achieves the identical visual result with a ~1KB component and no new dependency. If richer scroll-triggered animation is wanted later across the marketing site (services cards, capability panels), that's the point where adding `motion` earns its weight — worth a separate decision, not bundled into this change.

---

## 5. Edge cases to handle

| Case | Handling |
|---|---|
| User navigates away and back (client-side route) via the App Router | Component remounts on navigation back to `/`, so it **will** replay — this is standard and expected for a marketing home; not worth suppressing with `sessionStorage` for a one-page hero. If this becomes annoying in testing, the fix is a `sessionStorage.getItem("hero-played")` guard — noted here, not built unless requested. |
| Slow font load (`Inter` via Google Fonts `@import`, not `next/font`) | Because the char spans start in the settled (visible) state, a slow web-font swap (`font-display: swap`) just means the browser's fallback system font animates in, then re-flows to Inter when it loads — normal FOUT behaviour, unrelated to this change. (Separately worth migrating to `next/font/google` for self-hosted fonts — flagged in the production-readiness plan, not needed for this task.) |
| `prefers-reduced-motion` | Headline is present and correctly laid out immediately; `[data-play]` styles are neutralised entirely by the media query as a second line of defence (belt-and-braces with the JS check). |
| Screen readers / SEO | The `<h1 aria-label="BUILD THE AUTONOMOUS BUSINESS.">` carries the real accessible name; every visual span is `aria-hidden`. Google's crawler and screen readers both read the clean string. |
| Very long headline on narrow phones | Animation is per-character, not per-line, so wrapping at any width still looks correct — no line-dependent math. |

---

## 6. Verification

1. `tsc --noEmit`, `next lint`, `next build` — no new dependency, so risk is low.
2. Manual: load `/` in a fresh tab, confirm blur-in stagger, confirm total reveal time feels like "a beat," not "a show" (should read as finished by ~700-900ms for this headline length).
3. DevTools → Rendering → emulate `prefers-reduced-motion: reduce` → confirm instant, fully-visible text.
4. Screen reader spot check (VoiceOver/NVDA) → confirm it announces "Build the Autonomous Business." once, not letter by letter.
5. Lighthouse → confirm CLS is unaffected (should be 0 contribution from this element).
6. Throttle network to Slow 3G → confirm the headline is visible immediately on first paint (not blank), since JS/hydration lags behind CSS.

---

## 7. Effort

Small — one new ~50-line component, ~25 lines of CSS, one `page.tsx` edit. No schema, no API, no new dependency. Safe to implement in one pass.
