"use client"

import Link from "next/link"
import { Pill } from "lucide-react"
import { motion, useReducedMotion, type Variants } from "motion/react"

import { siteConfig } from "@/config/site"
import { scrollToTop } from "@/lib/scroll"
import { cn } from "@/lib/utils"

interface BrandProps {
  className?: string
  footer?: boolean
}

const MotionLink = motion.create(Link)

const spring = {
  type: "spring",
  stiffness: 420,
  damping: 26,
  mass: 0.6,
} as const

const tileVariants: Variants = {
  rest: { rotate: 0, scale: 1 },
  hover: { rotate: -6, scale: 1.06 },
  tap: { rotate: -2, scale: 0.94 },
}

const glyphVariants: Variants = {
  rest: { rotate: 0 },
  hover: { rotate: 28 },
  tap: { rotate: 12 },
}

const tileTheme = {
  default:
    "border-primary-200/80 bg-linear-to-br from-primary-50 to-primary-100 text-primary-text shadow-primary-950/5 dark:border-primary-900 dark:from-primary-950 dark:to-neutral-900",
  footer: "border-footer-border bg-footer-card text-footer-accent",
} as const

export function BrandLogo({ className, footer = false }: BrandProps) {
  const reduceMotion = useReducedMotion()

  return (
    <MotionLink
      animate="rest"
      aria-label={`${siteConfig.name} home`}
      className={cn(
        "inline-flex min-w-0 shrink-0 items-center gap-2 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring md:gap-2.5",
        className
      )}
      href="/#home"
      initial={false}
      onClick={scrollToTop}
      whileHover={reduceMotion ? undefined : "hover"}
      whileTap={reduceMotion ? undefined : "tap"}
    >
      <motion.span
        aria-hidden="true"
        className={cn(
          "grid size-10 shrink-0 place-items-center rounded-sm border shadow-sm md:size-11",
          footer ? tileTheme.footer : tileTheme.default
        )}
        transition={spring}
        variants={tileVariants}
      >
        <motion.span
          className="flex"
          transition={spring}
          variants={glyphVariants}
        >
          <Pill className="size-5 md:size-5.25" strokeWidth={2.2} />
        </motion.span>
      </motion.span>

      <span
        className={cn(
          "truncate font-display text-lg leading-none font-extrabold tracking-[-0.055em] md:text-xl",
          footer ? "text-footer-foreground" : "text-ink"
        )}
      >
        {siteConfig.name.toUpperCase()}
      </span>
    </MotionLink>
  )
}
