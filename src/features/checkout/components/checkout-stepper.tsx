"use client"

import { Check } from "lucide-react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "cn"

import { checkoutContent } from "../content"

const LABELS = [
  checkoutContent.steps.review,
  checkoutContent.steps.details,
  checkoutContent.steps.send,
]

export function CheckoutStepper({ current }: { current: number }) {
  const reduceMotion = useReducedMotion()

  return (
    <ol
      aria-label={checkoutContent.stepperLabel}
      className="m-0 flex list-none items-center gap-2 p-0 sm:gap-3"
    >
      {LABELS.map((label, index) => {
        const done = index < current
        const active = index === current

        return (
          <li
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex items-center gap-2 sm:gap-3",
              index < LABELS.length - 1 && "flex-1"
            )}
            key={label}
          >
            <span
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full border text-xs font-extrabold transition-colors duration-300",
                done && "border-primary bg-primary text-primary-foreground",
                active && "border-primary bg-primary/10 text-primary-text",
                !done &&
                  !active &&
                  "border-border bg-card text-muted-foreground"
              )}
            >
              {done ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.4 }}
                >
                  <Check aria-hidden="true" className="size-4" />
                </motion.span>
              ) : (
                index + 1
              )}
            </span>
            <span
              className={cn(
                "text-xs font-bold whitespace-nowrap transition-colors",
                active ? "text-ink" : "text-muted-foreground",
                !active && "max-sm:hidden"
              )}
            >
              {label}
            </span>
            {index < LABELS.length - 1 && (
              <span
                aria-hidden="true"
                className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-border"
              >
                <motion.span
                  animate={{ scaleX: done ? 1 : 0 }}
                  className="absolute inset-0 origin-left bg-primary"
                  initial={false}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.4 }
                  }
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
