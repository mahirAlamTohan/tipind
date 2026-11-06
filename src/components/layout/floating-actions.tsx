"use client"

import {
  ArrowUpRight,
  ShoppingCart,
  Headset,
  Mail,
  MessageCircle,
  Phone,
  X,
} from "lucide-react"
import { useEffect, useState } from "react"

import { Button, ButtonLink } from "@/components/ui/button"
import { Tooltip } from "@/components/ui/tooltip"
import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"
import { SIDEBAR_ID } from "@/features/cart/constants"
import { selectPacketCount, useCartStore } from "@/features/cart/cart-store"
import { scrollToSection } from "@/lib/scroll"

const ui = siteContent.ui
const round = "size-12 shadow-xl sm:size-13 [&_svg]:size-5"

function CartButton({
  showCount,
  count,
}: {
  showCount: boolean
  count: number
}) {
  const isOpen = useCartStore((state) => state.isOpen)
  const toggle = useCartStore((state) => state.actions.toggle)

  return (
    <Tooltip
      content={isOpen ? ui.cartCloseTooltip : ui.cartOpenTooltip}
      side="left"
    >
      <Button
        aria-controls={SIDEBAR_ID}
        aria-expanded={isOpen}
        aria-label={
          showCount ? `${ui.cartAction} (${count.toString()})` : ui.cartAction
        }
        className={`relative ${round}`}
        onClick={toggle}
        size="icon"
      >
        <ShoppingCart aria-hidden="true" />
        {showCount && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 grid min-w-5 place-items-center rounded-full border-2 border-background bg-danger-600 px-1 text-[0.6rem] leading-4 font-extrabold text-white"
          >
            {count > 99 ? "99+" : count.toString()}
          </span>
        )}
      </Button>
    </Tooltip>
  )
}

export function FloatingActions() {
  const [isOpen, setIsOpen] = useState(false)
  const hasContactGap = !siteConfig.contact.phone || !siteConfig.contact.email
  const hasWhatsapp = Boolean(siteConfig.contact.whatsappNumber)

  const count = useCartStore(selectPacketCount)
  const isHydrated = useCartStore((state) => state.isHydrated)
  const showCount = isHydrated && count > 0

  useEffect(() => {
    if (!isOpen) return

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [isOpen])

  const close = () => {
    setIsOpen(false)
  }

  return (
    // z-60 is below the cart sidebar (z-70), so the sidebar covers this stack.
    // Hidden below `sm`: the header already carries chat + cart on phones, and
    // the fixed stack covered the hero contact card there.
    <div className="fixed right-4 bottom-5 z-60 hidden flex-col items-end gap-3 sm:right-6 sm:bottom-6 sm:flex">
      {/* Row 1. Entrance is CSS (.float-pop); it mounts once the cart hydrates. */}
      {showCount && (
        <div className="float-pop" id="floating-cart" role="region">
          <CartButton count={count} showCount={showCount} />
        </div>
      )}
      {/* Row 2. The panel is anchored to this row and opens upward over row 1. */}
      <div className="relative flex items-center gap-3">
        {isOpen && (
            <div
              aria-label={ui.contactOptionsLabel}
              className="float-pop absolute right-0 bottom-full z-10 mb-3 w-[min(19rem,calc(100vw-2rem))] origin-bottom-right rounded-2xl border border-border bg-card p-3 shadow-2xl shadow-neutral-950/25"
              id="floating-contact-options"
              role="region"
            >
              <div className="mb-2.5 flex items-center gap-2 px-1.5 py-1">
                <span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary-text">
                  <Headset aria-hidden="true" className="size-4" />
                </span>
                <span className="text-sm font-extrabold text-foreground">
                  {ui.contactOptionsLabel}
                </span>
              </div>

              <div className="grid gap-2">
                <ButtonLink
                  className="min-h-11 justify-start rounded-xl px-3.5"
                  href={siteConfig.contact.phoneHref}
                  onClick={close}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-white/15">
                    <Phone aria-hidden="true" className="size-3.5" />
                  </span>
                  {ui.callUsAction}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="ml-auto size-4 opacity-75"
                  />
                </ButtonLink>
                <ButtonLink
                  className="min-h-11 justify-start rounded-xl bg-highlight-700 px-3.5 text-white shadow-highlight-950/15 hover:bg-highlight-800"
                  href={siteConfig.contact.emailHref}
                  onClick={close}
                >
                  <span className="grid size-7 place-items-center rounded-full bg-white/15">
                    <Mail aria-hidden="true" className="size-3.5" />
                  </span>
                  {ui.emailUsAction}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="ml-auto size-4 opacity-75"
                  />
                </ButtonLink>
              </div>

              <div className="mt-3 border-t border-border pt-3">
                <ButtonLink
                  className="min-h-10 w-full rounded-xl text-xs"
                  href="/#contact"
                  onClick={(event) => {
                    scrollToSection(event, "contact")
                    close()
                  }}
                  variant="outline"
                >
                  {ui.contactUsAction}
                  <ArrowUpRight aria-hidden="true" className="size-3.5" />
                </ButtonLink>
              </div>

              {hasContactGap && (
                <p className="m-0 mt-2 px-1.5 text-[0.65rem] leading-5 text-muted-foreground">
                  {siteContent.contact.description}
                </p>
              )}
            </div>
        )}

        <Tooltip
          content={
            isOpen ? ui.closeContactOptionsLabel : ui.contactOptionsTooltip
          }
        >
          <Button
            aria-controls="floating-contact-options"
            aria-expanded={isOpen}
            aria-label={
              isOpen ? ui.closeContactOptionsLabel : ui.contactUsAction
            }
            className={`${round} border border-white/15 bg-neutral-950 text-white hover:bg-neutral-900 dark:bg-neutral-800 dark:hover:bg-neutral-700`}
            onClick={() => {
              setIsOpen((open) => !open)
            }}
            size="icon"
          >
            {isOpen ? <X aria-hidden="true" /> : <Headset aria-hidden="true" />}
          </Button>
        </Tooltip>

        <Tooltip content={ui.whatsappTooltip}>
          <ButtonLink
            aria-label={ui.chatAction}
            className="size-13 border border-white/20 bg-whatsapp text-white shadow-xl ring-4 shadow-success-700/30 ring-success-500/20 hover:bg-whatsapp-hover sm:size-14 [&_svg]:size-6"
            href={siteConfig.contact.whatsappHref}
            rel={hasWhatsapp ? "noreferrer" : undefined}
            target={hasWhatsapp ? "_blank" : undefined}
          >
            <MessageCircle aria-hidden="true" />
            <span className="sr-only">{ui.chatAction}</span>
          </ButtonLink>
        </Tooltip>
      </div>
    </div>
  )
}
