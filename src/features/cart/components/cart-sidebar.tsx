"use client"
import { ShoppingCart, Trash2, X, ArrowRight, CircleCheck } from "lucide-react"
import { useEffect, useRef } from "react"

import { Button, ButtonLink } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatMills, formatNumber, pluralize } from "@/lib/format"

import { SIDEBAR_ID } from "../constants"
import {
  selectPacketCount,
  selectTotalMills,
  useCartStore,
} from "../cart-store"
import { cartContent as copy } from "../content"
import { CartResizeHandle } from "./cart-resize-handle"
import { CartLineCard } from "./cart-line-card"
import { Tooltip } from "@/components/ui/tooltip"
import { toast } from "sonner"

/**
 * Docked panel, not a modal: the page behind it stays usable.
 * On lg+ the page shrinks to make room (see main.css); below lg it covers the screen.
 */
export function CartSidebar() {
  const isOpen = useCartStore((state) => state.isOpen)
  const items = useCartStore((state) => state.items)
  const isHydrated = useCartStore((state) => state.isHydrated)
  const isStorageAvailable = useCartStore((state) => state.isStorageAvailable)
  const packets = useCartStore(selectPacketCount)
  const total = useCartStore(selectTotalMills)
  const { clear, setOpen } = useCartStore((state) => state.actions)
  const asideRef = useRef<HTMLElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Move focus in when opened; give it back when closed.
  useEffect(() => {
    if (!isOpen) return

    const aside = asideRef.current
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeRef.current?.focus({ preventScroll: true })

    return () => {
      const active = document.activeElement
      const lost =
        !active ||
        active === document.body ||
        (aside?.contains(active) ?? false)
      if (lost && previous?.isConnected) previous.focus({ preventScroll: true })
    }
  }, [isOpen])

  const packetsLabel = `${formatNumber(packets)} ${pluralize(packets, "packet", "packets")}`

  return (
    <aside
      aria-label={copy.title}
      className="@container invisible fixed inset-y-0 right-0 z-70 flex h-dvh w-full translate-x-full flex-col border-l border-border bg-background text-foreground shadow-2xl transition-[transform,visibility] duration-300 ease-out data-[open=true]:visible data-[open=true]:translate-x-0 motion-reduce:transition-none lg:w-(--cart-panel) lg:shadow-none"
      data-open={isOpen}
      id={SIDEBAR_ID}
      inert={!isOpen}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false)
      }}
      ref={asideRef}
    >
      <CartResizeHandle />

      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-2 text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
            <ShoppingCart aria-hidden="true" className="size-4" />
            {copy.eyebrow}
          </span>
          <h2 className="mt-1 mb-0 font-display text-xl font-extrabold tracking-tight text-ink">
            {copy.title}
          </h2>
          <p className="mt-1 mb-0 text-xs leading-5 text-muted-foreground">
            {copy.description}
          </p>
        </div>
        <div className="flex flex-row items-center justify-center space-x-2">
          <Tooltip
            content={{
              title: copy.clearAction,
            }}
            wrap
          >
            <Button
              className="w-full shrink-0 rounded-lg text-danger-600 hover:bg-danger-50 hover:text-danger-700 dark:text-danger-300 dark:hover:bg-danger-800/50"
              onClick={() => {
                clear()
                if (items.length > 0)
                  toast.success("Cart cleared", {
                    position: "bottom-left",
                    dismissible: true,
                    closeButton: true,
                    icon: (
                      <CircleCheck
                        aria-hidden="true"
                        className="size-6 stroke-success-500"
                      />
                    ),
                    classNames: {
                      title:
                        "ml-2 text-sm font-semibold text-success-950! dark:text-success-100!",
                      closeButton:
                        "bg-success-100! dark:bg-success-900! size-6! shadow",
                      toast:
                        "bg-success-50! dark:bg-success-950/70! backdrop-blur-sm! shadow-lg! dark:shadow-none!",
                    },
                  })
              }}
              variant="ghost"
            >
              <Trash2 aria-hidden="true" />
              {copy.clearAction}
            </Button>
          </Tooltip>
          <Button
            aria-label={copy.closeAction}
            className="size-9 shrink-0 rounded-lg text-ink-soft"
            onClick={() => {
              setOpen(false)
            }}
            ref={closeRef}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" />
          </Button>
        </div>
      </header>

      <div className="shrink-0 space-y-3 border-b border-border px-5 py-3">
        <Card className="gap-1 border-primary-200/80 bg-primary-50/80 p-3 text-xs leading-5 text-primary-950 dark:border-primary-900/80 dark:bg-primary-950/40 dark:text-primary-100">
          <p className="m-0">{copy.cartNotice}</p>
          <p className="m-0 text-primary-800 dark:text-primary-200">
            {copy.packPriceNote}
          </p>
        </Card>
        {!isStorageAvailable && (
          <p
            className="m-0 rounded-xl border border-warning-300 bg-warning-50 px-3 py-2 text-xs font-semibold text-warning-950 dark:border-warning-800 dark:bg-warning-950 dark:text-warning-100"
            role="status"
          >
            {copy.storageUnavailableNotice}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
        {!isHydrated ? (
          <div
            aria-busy="true"
            className="flex min-h-48 items-center justify-center text-sm font-semibold text-muted-foreground"
            role="status"
          >
            {copy.loadingCartMessage}
          </div>
        ) : items.length === 0 ? (
          <Card className="min-h-64 items-center justify-center p-8 text-center">
            <span className="mb-1 grid size-14 place-items-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-text dark:border-primary-900 dark:bg-primary-950">
              <ShoppingCart aria-hidden="true" className="size-6" />
            </span>
            <h3 className="m-0 font-display text-lg font-extrabold text-ink">
              {copy.emptyTitle}
            </h3>
            <p className="m-0 mb-3 max-w-sm text-sm leading-6 text-muted-foreground">
              {copy.emptyDescription}
            </p>
          </Card>
        ) : (
          <section aria-labelledby="cart-products-heading">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3
                className="m-0 font-display text-base font-extrabold text-ink"
                id="cart-products-heading"
              >
                {copy.productsHeading}
              </h3>
              <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                {formatNumber(items.length)}{" "}
                {pluralize(items.length, "product", "products")} ·{" "}
                {packetsLabel}
              </span>
            </div>
            <div className="space-y-3">
              {items.map((item) => (
                <CartLineCard item={item} key={item.id} />
              ))}
            </div>
          </section>
        )}
      </div>

      {isHydrated && items.length > 0 && (
        <div className="shrink-0 border-t border-border bg-card px-5 pt-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
          <div className="flex items-end justify-between gap-3">
            <h3 className="m-0 text-sm font-extrabold tracking-wide text-muted-foreground uppercase">
              {copy.totalLabel}
            </h3>
            <p className="m-0 text-2xl font-extrabold tracking-tight text-primary-text tabular-nums">
              {formatMills(total)}
            </p>
          </div>
          <p className="mt-1 mb-0 text-xs text-muted-foreground">
            {packetsLabel} total
          </p>
          <ButtonLink
            className="mt-4 w-full"
            href="/checkout"
            onClick={() => {
              setOpen(false)
            }}
            size="lg"
          >
            {copy.proceedToCheckoutAction}
            <ArrowRight aria-hidden="true" />
          </ButtonLink>
        </div>
      )}
    </aside>
  )
}
