"use client"

import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { totalUnits } from "@/features/cart/lib/pack-units"
import type { CartLineItem } from "@/features/cart/types"
import { formatMills, formatNumber, pluralize } from "@/lib/format"

import { FORM_ID } from "../constants"
import { checkoutContent } from "../content"
import type { CheckoutStep, OrderTotals } from "../types"

/** Fades the value in whenever it changes. */
function Amount({
  mills,
  strong = false,
}: {
  mills: number | null
  strong?: boolean
}) {
  const reduceMotion = useReducedMotion()

  if (mills === null) {
    return (
      <span className="text-xs font-semibold text-muted-foreground">
        {checkoutContent.summary.pending}
      </span>
    )
  }
  return (
    <motion.span
      animate={{ opacity: 1, y: 0 }}
      className={
        strong
          ? "text-2xl font-extrabold tracking-tight text-primary-text tabular-nums"
          : "text-sm font-bold text-ink-soft tabular-nums"
      }
      initial={reduceMotion ? false : { opacity: 0, y: 4 }}
      key={mills}
    >
      {formatMills(mills)}
    </motion.span>
  )
}

interface OrderSummaryProps {
  items: readonly CartLineItem[]
  onBack: () => void
  onContinue: () => void
  step: CheckoutStep
  totals: OrderTotals
}

export function OrderSummary({
  items,
  onBack,
  onContinue,
  step,
  totals,
}: OrderSummaryProps) {
  const copy = checkoutContent.summary

  return (
    <Card className="gap-4 p-5 shadow-soft lg:sticky lg:top-28">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="m-0 font-display text-lg font-extrabold text-ink">
          {copy.heading}
        </h2>
        <span className="text-xs font-semibold text-muted-foreground">
          {formatNumber(items.length)}{" "}
          {pluralize(items.length, copy.itemSingular, copy.itemPlural)}
        </span>
      </div>

      {/* Once the cards are gone, keep the items visible. */}
      {step === "details" && (
        <ul className="m-0 max-h-44 list-none space-y-1.5 overflow-y-auto rounded-md border border-border/70 bg-muted/40 p-3 text-xs">
          {items.map((item) => (
            <li
              className="flex items-baseline justify-between gap-3"
              key={item.id}
            >
              <span className="min-w-0 truncate font-semibold text-ink-soft">
                {item.name}
              </span>
              <span className="shrink-0 text-muted-foreground tabular-nums">
                × {formatNumber(totalUnits(item))}
              </span>
            </li>
          ))}
        </ul>
      )}

      <dl className="m-0 space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-muted-foreground">{copy.subtotal}</dt>
          <dd className="m-0">
            <Amount mills={totals.subtotalMills} />
          </dd>
        </div>
        {totals.charges.map((charge) => (
          <div
            className="flex items-center justify-between gap-3"
            key={charge.id}
          >
            <dt className="text-muted-foreground">{copy.shipping}</dt>
            <dd className="m-0">
              <Amount mills={charge.amountMills} />
            </dd>
          </div>
        ))}
        <div className="flex items-end justify-between gap-3 border-t border-border pt-3">
          <dt className="text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
            {copy.total}
          </dt>
          <dd className="m-0">
            <Amount mills={totals.totalMills} strong />
          </dd>
        </div>
      </dl>

      {step === "review" ? (
        <Button className="w-full" onClick={onContinue} size="lg">
          {copy.continueAction}
          <ArrowRight aria-hidden="true" />
        </Button>
      ) : (
        <div className="space-y-2">
          <Button className="w-full" form={FORM_ID} size="lg" type="submit">
            {copy.checkoutAction}
            <ArrowRight aria-hidden="true" />
          </Button>
          <Button className="w-full" onClick={onBack} variant="ghost">
            <ArrowLeft aria-hidden="true" />
            {copy.backAction}
          </Button>
        </div>
      )}

      <p className="m-0 flex items-start gap-2 text-[0.7rem] leading-5 text-muted-foreground">
        <ShieldCheck
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-success-600 dark:text-success-300"
        />
        {copy.note}
      </p>
    </Card>
  )
}
