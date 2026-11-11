import type { ReactNode } from "react"

interface RevealProps {
  children: ReactNode
  className?: string
  /** Seconds to wait before the reveal starts. */
  delay?: number
  role?: string
  "aria-label"?: string
  /** Convenience for callers that pass test/automation hooks straight through. */
  "data-testid"?: string
}

/**
 * Fades and lifts its children in once, as they scroll into view.
 *
 * Pure CSS (`animation-timeline: view()`) so this compiles to a plain <div> and
 * the sections that use it stay server components. Browsers without scroll
 * timelines never animate and simply show the content — the animation is
 * decorative, so there is nothing to feature-detect or hydrate.
 *
 * See `.reveal` in src/styles/main.css.
 */
export function Reveal({ children, className, delay = 0, ...props }: RevealProps) {
  return (
    <div
      className={className ? `reveal ${className}` : "reveal"}
      style={{ "--reveal-delay": `${delay.toString()}s` } as React.CSSProperties}
      {...props}
    >
      {children}
    </div>
  )
}
