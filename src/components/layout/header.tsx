"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, type MouseEvent } from "react"
import { ArrowUpRight, MessageCircle } from "lucide-react"
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "motion/react"

import { BrandLogo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { TopStrip } from "@/components/layout/top-strip"
import { ButtonLink } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { CartTrigger } from "@/features/cart/components/cart-trigger"
import { useActiveSection } from "@/hooks/use-active-section"
import { scrollToSection } from "@/lib/scroll"

const STRIP_HEIGHT = 36 // px, matches h-9 in TopStrip
const FLOAT_GAP = 10 // px, keep in sync with --float-gap below
const FLOAT_AFTER = 64 // px of scroll until fully floating
const MAX_WIDTH = "75rem"
const HOME_ID = "home"

const navSpring = { type: "spring", stiffness: 500, damping: 36 } as const

const NAV_ITEMS = siteConfig.navigation.map((item) => ({
  ...item,
  id: item.href.replace("#", ""),
}))
const SECTION_IDS = NAV_ITEMS.map((item) => item.id)

/** Sections left out of the mobile bar so it fits without scrolling. */
const HIDDEN_ON_MOBILE = new Set(["faq"])
const MOBILE_ITEMS = NAV_ITEMS.filter((item) => !HIDDEN_ON_MOBILE.has(item.id))

interface NavProps {
  activeId: string
  onSelect: (id: string, event: MouseEvent<HTMLElement>) => void
}

function DesktopNav({ activeId, onSelect }: NavProps) {
  const reduceMotion = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const highlighted = hovered ?? activeId

  return (
    <nav
      aria-label={siteContent.ui.mainNavigationLabel}
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
      onMouseLeave={() => {
        setHovered(null)
      }}
    >
      {NAV_ITEMS.map((item) => (
        <Link
          aria-current={item.id === activeId ? "location" : undefined}
          className="relative isolate inline-flex min-h-10 items-center rounded-full px-3.5 text-[0.78rem] font-semibold text-neutral-600 transition-colors duration-150 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=location]:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-100 dark:aria-[current=location]:text-primary-200"
          href={`/#${item.id}`}
          key={item.id}
          onBlur={() => {
            setHovered(null)
          }}
          onClick={(event) => {
            onSelect(item.id, event)
          }}
          onFocus={() => {
            setHovered(item.id)
          }}
          onMouseEnter={() => {
            setHovered(item.id)
          }}
        >
          {highlighted === item.id && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 -z-10 rounded-full bg-primary-100 dark:bg-primary-900/50"
              layoutId="nav-pill"
              transition={reduceMotion ? { duration: 0 } : navSpring}
            />
          )}
          {item.label}
        </Link>
      ))}
    </nav>
  )
}

function MobileNav({ activeId, onSelect }: NavProps) {
  return (
    <Container className="md:hidden">
      <nav
        aria-label={siteContent.ui.mobileNavigationLabel}
        className="flex h-12 items-center gap-1 border-t border-border"
      >
        {MOBILE_ITEMS.map((item) => (
          <Link
            aria-current={item.id === activeId ? "location" : undefined}
            className="inline-flex h-9 min-w-0 flex-1 items-center justify-center rounded-full px-1.5 text-xs font-semibold text-neutral-600 transition-colors active:bg-primary-100 aria-[current=location]:bg-primary-100 aria-[current=location]:text-primary-800 dark:text-neutral-300 dark:active:bg-primary-900/50 dark:aria-[current=location]:bg-primary-900/50 dark:aria-[current=location]:text-primary-100"
            href={`/#${item.id}`}
            key={item.id}
            onClick={(event) => {
              onSelect(item.id, event)
            }}
          >
            <span className="truncate">{item.mobileLabel}</span>
          </Link>
        ))}
      </nav>
    </Container>
  )
}

export function SiteHeader() {
  const reduceMotion = useReducedMotion()
  const { scrollY, scrollYProgress } = useScroll()

  const pathname = usePathname()
  const onHome = pathname === "/"
  const { activeId: spyId, lock } = useActiveSection(SECTION_IDS, HOME_ID)
  const activeId = onHome ? spyId : ""

  function handleSelect(id: string, event: MouseEvent<HTMLElement>) {
    lock(id)
    scrollToSection(event, id)
  }

  // Page progress bar (transform only)
  const barSpring = useSpring(scrollYProgress, {
    damping: 30,
    restDelta: 0.001,
    stiffness: 120,
  })

  // 0 = docked, 1 = floating. Drives the background layer only.
  const rawProgress = useTransform(scrollY, [0, FLOAT_AFTER], [0, 1], {
    clamp: true,
  })
  const springProgress = useSpring(rawProgress, {
    damping: 32,
    mass: 0.6,
    stiffness: 220,
  })
  const progress = reduceMotion ? rawProgress : springProgress

  // Outer layer: glued to the strip's bottom edge until it scrolls away,
  // then pinned to the very top (this alone is the mobile behavior).
  const y = useTransform(scrollY, (value) =>
    Math.min(STRIP_HEIGHT, Math.max(0, STRIP_HEIGHT - value))
  )
  // Inner layer: adds the floating gap once the strip is gone.
  // --float-gap is 0px on mobile, so it does nothing there.
  const gapProgress = useTransform(
    scrollY,
    [STRIP_HEIGHT - FLOAT_GAP, STRIP_HEIGHT],
    [0, 1]
  )
  const gapY = useTransform(
    gapProgress,
    (v) => `calc(${v.toFixed(3)} * var(--float-gap))`
  )

  // Desktop: floating gutter, capped at MAX_WIDTH. Mobile: both vars are 0,
  // so the shell stays edge to edge with square corners.
  const inset = useTransform(
    progress,
    (v) =>
      `calc(${v.toFixed(3)} * max(var(--float-gutter), (100% - ${MAX_WIDTH}) / 2))`
  )
  const radius = useTransform(
    progress,
    (v) => `calc(${v.toFixed(3)} * var(--float-radius))`
  )
  const hairlineOpacity = useTransform(progress, [0, 1], [1, 0])

  return (
    <>
      <TopStrip />

      <motion.div
        aria-hidden="true"
        className="fixed top-0 right-(--cart-w) left-0 z-60 h-0.75 origin-left bg-linear-to-r from-primary to-highlight-300 transition-[right] duration-300 ease-out motion-reduce:transition-none"
        style={{ scaleX: reduceMotion ? scrollYProgress : barSpring }}
      />

      {/* Reserves the space the fixed header occupies: 56 + 48 on mobile, 72 on desktop */}
      <div aria-hidden="true" className="h-26 md:h-18" />

      <motion.div
        className="pointer-events-none fixed top-0 right-(--cart-w) left-0 z-50 transition-[right] duration-300 ease-out [--float-gap:0px] [--float-gutter:0px] [--float-radius:0px] motion-reduce:transition-none md:[--float-gap:10px] md:[--float-gutter:1rem] md:[--float-radius:24px]"
        style={{ y }}
      >
        <motion.div className="relative" style={{ y: gapY }}>
          {/* Background shell: the only thing that changes size */}
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 bg-background/90 backdrop-blur-lg md:bg-background/85"
            style={{ borderRadius: radius, left: inset, right: inset }}
          >
            {/* Desktop: floating border + shadow fade in */}
            <motion.div
              className="absolute inset-0 rounded-[inherit] border border-primary-200/80 shadow-header-floating max-md:hidden dark:border-primary/50"
              style={{ opacity: progress }}
            />
            {/* Desktop: docked hairline fades out as it floats */}
            <motion.div
              className="absolute inset-x-0 bottom-0 h-px bg-border max-md:hidden"
              style={{ opacity: hairlineOpacity }}
            />
            {/* Mobile: always docked, permanent hairline */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-border md:hidden" />
          </motion.div>

          <header className="pointer-events-auto relative">
            <Container className="flex h-14 items-center gap-2 md:h-18 md:gap-4 lg:gap-6">
              <BrandLogo className="min-w-0" />
              <DesktopNav activeId={activeId} onSelect={handleSelect} />

              <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
                <ButtonLink
                  aria-label={siteContent.ui.chatAction}
                  className="w-9 gap-2 px-0 shadow-md shadow-primary-900/15 min-[400px]:w-auto min-[400px]:px-3 sm:px-3.5 [&_svg]:size-3.5"
                  href={siteConfig.contact.whatsappHref}
                  rel="noreferrer"
                  size="sm"
                  target="_blank"
                >
                  <MessageCircle aria-hidden="true" />
                  <span className="sr-only min-[400px]:not-sr-only">
                    {siteContent.ui.chatAction}
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="hidden sm:block"
                  />
                </ButtonLink>
                {onHome && <CartTrigger />}
                <ThemeToggle className="size-9 border border-border text-ink-soft hover:bg-primary-100 hover:text-primary-700 md:size-10 dark:hover:bg-primary-950 dark:hover:text-primary-200" />
              </div>
            </Container>
            <MobileNav activeId={activeId} onSelect={handleSelect} />
          </header>
        </motion.div>
      </motion.div>
    </>
  )
}
