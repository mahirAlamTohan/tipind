"use client"

import { useMemo } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Check, Copy, X } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import type { CartLineItem } from "@/features/cart/types"
import { useCopy } from "@/hooks/use-copy"

import { checkoutContent } from "../content"
import { trimDetails } from "../lib/details"
import { buildOrderMessage } from "../lib/order-message"
import type { OrderTotals, ShippingDetails } from "../types"

const list = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.08 } },
}

function PendingMark() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      initial={reduceMotion ? false : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex size-14 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-400/10 dark:text-amber-400"
    >
      <motion.div
        animate={reduceMotion ? {} : { rotate: [0, 180, 180] }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 1], // Quick flip at the start, then pause
        }}
      >
        {/* You can use Lucide's Hourglass icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 22h14" />
          <path d="M5 2h14" />
          <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22" />
          <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2" />
        </svg>
      </motion.div>
    </motion.div>
  )
}

interface OrderDialogProps {
  details: ShippingDetails
  items: readonly CartLineItem[]
  onClose: () => void
  onFinish: () => void
  totals: OrderTotals
}

export function OrderDialog({
  details,
  items,
  onClose,
  onFinish,
  totals,
}: OrderDialogProps) {
  const copy = checkoutContent.dialog
  const { copy: copyText, state } = useCopy(999999)

  const message = useMemo(
    () =>
      buildOrderMessage({
        details: trimDetails(details),
        items,
        totals,
      }),
    [details, items, totals]
  )

  const { email, telegramUsername } = siteConfig.contact

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-90 bg-neutral-950/55 backdrop-blur-xs transition-opacity duration-200 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none" />
        <Dialog.Popup className="fixed inset-0 z-91 m-auto flex h-fit max-h-[calc(100dvh-1.5rem)] w-[min(40rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl transition-[opacity,scale] duration-200 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 motion-reduce:transition-none">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <PendingMark />
              <Button
                aria-label={copy.closeAction}
                className="size-9 rounded-lg text-ink-soft"
                onClick={onClose}
                size="icon"
                variant="ghost"
              >
                <X aria-hidden="true" />
              </Button>
            </div>

            <Dialog.Title className="mt-3 mb-0 font-display text-2xl font-extrabold tracking-tight text-ink">
              {copy.title}
            </Dialog.Title>
            <Dialog.Description className="mt-1 mb-0 text-sm leading-6 text-muted-foreground">
              {copy.description}
            </Dialog.Description>

            <h3 className="mt-6 mb-3 text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
              {copy.optionsHeading}
            </h3>
            <motion.div
              variants={list}
              initial="hidden"
              animate="show"
              className="mt-3 flex flex-col gap-3 rounded-lg border border-primary-200/80 bg-primary-50/50 p-4 text-primary-950 dark:border-primary-900/80 dark:bg-primary-950/30 dark:text-primary-100"
            >
              <div className="space-y-2.5 text-sm">
                {/* Step 1 */}
                <div className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-200/60 text-xs font-bold dark:bg-primary-800/60">
                    1
                  </span>
                  <p className="leading-relaxed">{copy.stepCopyTemplate}</p>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-200/60 text-xs font-bold dark:bg-primary-800/60">
                    2
                  </span>
                  <div className="w-full space-y-1.5">
                    <p className="leading-relaxed">{copy.stepSend}</p>

                    <div className="flex flex-col gap-1.5 pl-1">
                      {email && (
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span>✉️</span>
                          <span className="text-primary-700 dark:text-primary-300">
                            {copy.emailLabel}
                          </span>
                          <code className="rounded bg-primary-200/40 px-1.5 py-0.5 dark:bg-primary-900/50">
                            {email}
                          </code>
                        </div>
                      )}
                      {telegramUsername && (
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span>✈️</span>
                          <span className="text-primary-700 dark:text-primary-300">
                            {copy.telegramLabel}
                          </span>
                          <code className="rounded bg-primary-200/40 px-1.5 py-0.5 dark:bg-primary-900/50">
                            {telegramUsername}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Warning Box */}
              {telegramUsername && (
                <div className="mt-1 flex gap-2 rounded-md border border-amber-500/20 bg-warning-500/5 p-2.5 text-xs leading-relaxed text-warning-900 dark:border-warning-400/20 dark:bg-warning-400/5 dark:text-warning-200">
                  <span className="shrink-0 text-sm">📌</span>
                  <p>
                    <strong className="font-semibold">
                      {copy.safetyTitle}
                    </strong>{" "}
                    {copy.safetyBody}
                  </p>
                </div>
              )}
            </motion.div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <h3 className="m-0 text-xs font-extrabold tracking-wide text-muted-foreground uppercase">
                {copy.messageHeading}
              </h3>
              <Button
                className="h-8 px-3 text-xs"
                onClick={() => void copyText(message)}
                size="sm"
                variant="outline"
              >
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    className="inline-flex items-center gap-1.5"
                    exit={{ opacity: 0, scale: 0.8 }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    key={state}
                  >
                    {state === "copied" ? (
                      <Check
                        aria-hidden="true"
                        className="text-success-600 dark:text-success-300"
                      />
                    ) : (
                      <Copy aria-hidden="true" />
                    )}
                    {state === "copied" ? copy.copiedAction : copy.copyAction}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </div>
            <pre
              className="mt-2 mb-0 max-h-64 overflow-auto rounded-xl border border-border bg-muted/50 p-4 font-sans text-xs leading-5 whitespace-pre-wrap text-ink-soft"
              tabIndex={0}
            >
              {message}
            </pre>
            {state === "failed" && (
              <p
                className="m-0 mt-2 text-xs font-medium text-danger-700 dark:text-danger-300"
                role="alert"
              >
                {copy.copyFailed}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-border bg-card px-5 py-3 sm:px-7">
            <Button onClick={onClose} variant="outline">
              {copy.editAction}
            </Button>
            <Button onClick={onFinish} variant="default">
              {copy.finishAction}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
