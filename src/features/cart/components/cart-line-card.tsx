"use client"
import { Minus, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatMessage, formatMills, formatNumber } from "@/lib/format"

import { MAX_QUANTITY } from "../constants"
import { lineTotalMills } from "../lib/line-items"
import { useCartStore } from "../cart-store"
import type { CartLineItem } from "../types"
import { cartContent as copy } from "../content"

const label =
  "mb-1.5 block text-[0.65rem] font-bold tracking-wide text-muted-foreground uppercase"

function QuantityStepper({ item }: { item: CartLineItem }) {
  const setQuantity = useCartStore((state) => state.actions.setQuantity)
  const values = {
    packSize: item.packaging || "listed pack",
    product: item.name,
  }

  return (
    <div>
      <span className={label}>
        {copy.packetCountLabel}
        {item.packaging ? ` of ${item.packaging}` : ""}
      </span>
      <div
        aria-label={formatMessage(copy.setQuantityAriaLabel, values)}
        className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-input bg-background p-1 shadow-sm"
        role="group"
      >
        <Button
          aria-label={formatMessage(copy.decreaseQuantityAriaLabel, values)}
          className="size-8 rounded-lg text-primary-text"
          disabled={item.quantity <= 1}
          onClick={() => {
            setQuantity(item.id, item.quantity - 1)
          }}
          size="icon"
          variant="ghost"
        >
          <Minus aria-hidden="true" />
        </Button>
        <output
          aria-live="polite"
          className="min-w-9 text-center text-sm font-extrabold tabular-nums"
        >
          {formatNumber(item.quantity)}
        </output>
        <Button
          aria-label={formatMessage(copy.increaseQuantityAriaLabel, values)}
          className="size-8 rounded-lg text-primary-text"
          disabled={item.quantity >= MAX_QUANTITY}
          onClick={() => {
            setQuantity(item.id, item.quantity + 1)
          }}
          size="icon"
          variant="ghost"
        >
          <Plus aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}

/** Must render inside an `@container` (the sidebar provides one). */
export function CartLineCard({ item }: { item: CartLineItem }) {
  const removeItem = useCartStore((state) => state.actions.removeItem)

  const subtitle = [
    item.manufacturer,
    item.packaging ? `${copy.packLabel}: ${item.packaging}` : "",
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <article className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 text-base font-extrabold wrap-break-word text-ink">
            {item.name}
          </h3>
          {(subtitle || item.ingredient) && (
            <p className="mt-1 mb-0 text-xs leading-5 text-muted-foreground">
              {subtitle || item.ingredient}
            </p>
          )}
          {subtitle && item.ingredient && (
            <p className="mt-1 mb-0 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {item.ingredient}
            </p>
          )}
        </div>
        <Button
          aria-label={formatMessage(copy.removeItemAriaLabel, {
            product: item.name,
          })}
          className="size-9 shrink-0 rounded-lg text-danger-700 hover:bg-danger-50 hover:text-danger-800 dark:text-danger-300 dark:hover:bg-danger-950/50"
          onClick={() => {
            removeItem(item.id)
          }}
          size="icon"
          variant="ghost"
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </div>

      <div className="mt-4 grid grid-cols-2 items-end gap-4 border-t border-border/70 pt-4 @md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <div>
          <span className={label}>{copy.singlePacketPriceLabel}</span>
          <span className="text-sm font-bold text-ink-soft tabular-nums">
            {formatMills(item.unitPriceMills)}
          </span>
        </div>
        <QuantityStepper item={item} />
        <div className="col-span-2 text-right @md:col-span-1">
          <span className={label}>{copy.lineTotalLabel}</span>
          <span className="text-lg font-extrabold text-primary-text tabular-nums">
            {formatMills(lineTotalMills(item))}
          </span>
        </div>
      </div>
    </article>
  )
}
