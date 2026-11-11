"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { CartLineCard } from "@/features/cart/components/cart-line-card"
import type { CartLineItem } from "@/features/cart/types"

import { checkoutContent } from "../content"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function ReviewStep({ items }: { items: readonly CartLineItem[] }) {
  const reduceMotion = useReducedMotion()
  const copy = checkoutContent.review
  const router = useRouter()

  return (
    <section aria-labelledby="checkout-review-heading">
      <h2
        className="m-0 font-display text-xl font-extrabold tracking-tight text-ink"
        id="checkout-review-heading"
      >
        {copy.heading}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">{copy.hint}</p>

      {/* CartLineCard uses container queries and needs this wrapper. */}
      <div className="@container space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
              initial={reduceMotion ? false : { opacity: 0, y: 10 }}
              key={item.id}
              layout={!reduceMotion}
              transition={{ duration: 0.25 }}
            >
              <CartLineCard item={item} />
            </motion.div>
          ))}
          <Button
            className="w-full border-3 border-dashed border-primary-600/50 py-8"
            variant="ghost"
            onClick={() => {
              router.push("/#catalog")
            }}
          >
            {copy.addMoreAction}
          </Button>
        </AnimatePresence>
      </div>
    </section>
  )
}
