import type { CSSProperties } from "react"

// The headline resolves character by character on load.
//
// Splitting text into per-character elements normally wrecks it for screen
// readers, which can end up announcing it letter by letter. So the real
// sentence lives in aria-label on the <h1> and every visual fragment below is
// aria-hidden — assistive tech reads one clean sentence, everyone else sees
// the animation. Words are kept in unbreakable spans so a narrow screen wraps
// between words, never mid-word.
//
// No JavaScript: the stagger is animation-delay, rendered on the server.

const LINES: Array<{ text: string; accent?: boolean }> = [
  { text: "Build the" },
  { text: "Autonomous", accent: true },
  { text: "Business." },
]

const STAGGER_MS = 30

// The accent word is coloured per character along a cyan → violet ramp. A
// single bg-clip-text gradient would be the obvious approach, but each
// character carries its own transform during the animation, which breaks the
// clip. Interpolating solid colours gives the same continuous sweep and
// survives the transform.
const FROM_RGB = [0, 229, 255] as const // cyan-500
const TO_RGB = [167, 139, 250] as const // violet-300

function rampColor(position: number): string {
  const channels = FROM_RGB.map((from, i) => Math.round(from + (TO_RGB[i]! - from) * position))
  return `rgb(${channels.join(" ")})`
}

export function AnimatedHeadline({ className }: { className?: string }) {
  const sentence = LINES.map((line) => line.text).join(" ")
  let charIndex = 0

  return (
    <h1 aria-label={sentence} className={className}>
      {LINES.map((line) => {
        const words = line.text.split(" ")
        const accentLength = line.text.replace(/\s/g, "").length
        let accentIndex = 0

        return (
          <span key={line.text} aria-hidden="true" className="block">
            {words.map((word, wordIndex) => (
              <span key={`${word}-${wordIndex}`} className="inline-block whitespace-nowrap">
                {Array.from(word).map((char, i) => {
                  const style: CSSProperties = {
                    animationDelay: `${charIndex++ * STAGGER_MS}ms`,
                  }
                  if (line.accent) {
                    style.color = rampColor(accentIndex++ / Math.max(accentLength - 1, 1))
                  }
                  return (
                    <span
                      key={`${char}-${i}`}
                      style={style}
                      className="inline-block animate-letter-in motion-reduce:animate-none"
                    >
                      {char}
                    </span>
                  )
                })}
                {wordIndex < words.length - 1 && <span className="inline-block">&nbsp;</span>}
              </span>
            ))}
          </span>
        )
      })}
    </h1>
  )
}
