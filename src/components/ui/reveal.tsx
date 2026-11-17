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
 */
export function Reveal({
  children,
  className,
  delay = 0,
  ...props
}: RevealProps) {
  return (
    <div
      className={className ? `reveal ${className}` : "reveal"}
      style={
        { "--reveal-delay": `${delay.toString()}s` } as React.CSSProperties
      }
      {...props}
    >
      {children}
    </div>
  )
}
