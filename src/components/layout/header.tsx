"use client"

import { ArrowUpRight, MessageCircle } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import type { MouseEvent } from "react"

import { BrandLogo } from "@/components/layout/logo"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { TopStrip } from "@/components/layout/top-strip"
import { ButtonLink } from "@/components/ui/button"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { contactLinks } from "@/config/links"
import { CartTrigger } from "@/features/cart/components/cart-trigger"
import { useActiveSection } from "@/hooks/use-active-section"
import { scrollToSection } from "@/lib/scroll"

const HOME_ID = "home"

/** `id` is the source of truth; links are derived, never stored. */
const NAV_ITEMS = siteConfig.navigation
const SECTION_IDS = NAV_ITEMS.map((item) => item.id)

/** Sections left out of the mobile bar so it fits without scrolling. */
const HIDDEN_ON_MOBILE = new Set(["faq"])
const MOBILE_ITEMS = NAV_ITEMS.filter((item) => !HIDDEN_ON_MOBILE.has(item.id))

interface NavProps {
  activeId: string
  onSelect: (id: string, event: MouseEvent<HTMLElement>) => void
}

function DesktopNav({ activeId, onSelect }: NavProps) {
  return (
    <nav
      aria-label={siteContent.ui.mainNavigationLabel}
      className="hidden flex-1 items-center justify-center gap-1 md:flex"
    >
      {NAV_ITEMS.map((item) => (
        <Link
          aria-current={item.id === activeId ? "location" : undefined}
          className="nav-link relative isolate inline-flex min-h-10 items-center rounded-full px-3.5 text-[0.78rem] font-semibold text-neutral-600 transition-colors duration-150 hover:text-primary-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=location]:text-primary-700 dark:text-neutral-300 dark:hover:text-primary-100 dark:aria-[current=location]:text-primary-200"
          href={`/#${item.id}`}
          key={item.id}
          onClick={(event) => {
            onSelect(item.id, event)
          }}
        >
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

/**
 * Sticky header.
 *
 * The docked→floating transition, the reading-progress bar and the floating
 * gap all run on CSS scroll-driven animations (`.site-header*` in main.css).
 * They used to be `motion` springs driven by a scroll listener, which cost a
 * 95 kB animation runtime plus a JS scroll handler on every page. See the
 * `.site-header` block for the fallback story: browsers without
 * `animation-timeline` simply get the docked header, which is the pre-scroll
 * state and fully usable.
 */
export function SiteHeader() {
  const pathname = usePathname()
  const onHome = pathname === "/"
  const { activeId: spyId, lock } = useActiveSection(SECTION_IDS, HOME_ID)
  const activeId = onHome ? spyId : ""

  function handleSelect(id: string, event: MouseEvent<HTMLElement>) {
    lock(id)
    scrollToSection(event, id)
  }

  return (
    <>
      <TopStrip />

      <div
        aria-hidden="true"
        className="site-progress fixed top-0 right-(--cart-w) left-0 z-60 h-0.75 origin-left bg-linear-to-r from-primary to-highlight-300 transition-[right] duration-300 ease-out motion-reduce:transition-none"
      />

      {/* Reserves the space the fixed header occupies: 64 + 48 on mobile, 72 on desktop */}
      <div aria-hidden="true" className="h-26 md:h-18" />

      <div className="site-header pointer-events-none fixed top-9 right-(--cart-w) left-0 z-50 transition-[right] duration-300 ease-out [--float-gap:0px] [--float-gutter:0px] [--float-radius:0px] motion-reduce:transition-none md:[--float-gap:10px] md:[--float-gutter:1rem] md:[--float-radius:24px]">
        <div className="site-header-gap relative">
          {/* Background shell: the only thing that changes size */}
          <div
            aria-hidden="true"
            className="site-header-shell pointer-events-none absolute inset-y-0 bg-background/90 backdrop-blur-lg md:bg-background/85"
          >
            {/* Desktop: floating border + shadow fade in */}
            <div className="site-header-border absolute inset-0 rounded-[inherit] border border-primary-200/80 shadow-header-floating max-md:hidden dark:border-primary/50" />
            {/* Desktop: docked hairline fades out as it floats */}
            <div className="site-header-hairline absolute inset-x-0 bottom-0 h-px bg-border max-md:hidden" />
            {/* Mobile: always docked, permanent hairline */}
            <div className="absolute inset-x-0 bottom-0 h-px bg-border md:hidden" />
          </div>

          <header className="pointer-events-auto relative">
            <Container className="flex h-14 items-center gap-2 md:h-18 md:gap-4 lg:gap-6">
              <BrandLogo className="min-w-0" />
              <DesktopNav activeId={activeId} onSelect={handleSelect} />

              <div className="ml-auto flex shrink-0 items-center gap-1.5 md:gap-2">
                <ButtonLink
                  aria-label={siteContent.ui.chatAction}
                  className="w-9 gap-2 px-0 shadow-md shadow-primary-900/15 min-[400px]:w-auto min-[400px]:px-3 sm:px-3.5 [&_svg]:size-3.5"
                  href={contactLinks.whatsapp()}
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
        </div>
      </div>
    </>
  )
}
