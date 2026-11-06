import { Pill } from "lucide-react"

import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

interface BrandProps {
  className?: string
  footer?: boolean
}

const tileTheme = {
  default:
    "border-primary-200/80 bg-linear-to-br from-primary-50 to-primary-100 text-primary-text shadow-primary-950/5 dark:border-primary-900 dark:from-primary-950 dark:to-neutral-900",
  footer: "border-footer-border bg-footer-card text-footer-accent",
} as const

/**
 * The hover/tap wobble is CSS (`group` + `.brand-tile` in main.css) so the logo
 * is a server component. It used to hydrate through `motion` for a decorative
 * 6-degree rotate.
 */
export function BrandLogo({ className, footer = false }: BrandProps) {
  return (
    <a
      aria-label={`${siteConfig.name} home`}
      className={cn(
        "group inline-flex min-w-0 shrink-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:gap-2.5",
        className
      )}
      href="#home"
    >
      <span
        aria-hidden="true"
        className={cn(
          "brand-tile grid size-10 shrink-0 place-items-center rounded-sm border shadow-sm md:size-11",
          footer ? tileTheme.footer : tileTheme.default
        )}
      >
        <span className="brand-glyph flex">
          <Pill className="size-5 md:size-5.25" strokeWidth={2.2} />
        </span>
      </span>

      <span
        className={cn(
          "truncate font-display text-lg leading-none font-extrabold tracking-[-0.055em] md:text-xl",
          footer ? "text-footer-foreground" : "text-ink"
        )}
      >
        {siteConfig.name.toUpperCase()}
      </span>
    </a>
  )
}
