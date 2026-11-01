"use client"

import { Dialog } from "@base-ui/react/dialog"
import { Check, Copy, Mail, MessageCircle, Send, X, Info } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useMemo, useState, type ReactNode } from "react"

import { Button } from "@/components/ui/button"
import { siteConfig } from "@/config/site"
import type { CartLineItem } from "@/features/cart/types"
import { formatMessage } from "@/lib/format"
import { cn } from "@/lib/utils"

import { checkoutContent } from "../content"
import type { ChannelLink } from "../lib/channels"
import { buildChannels } from "../lib/channels"
import { trimDetails } from "../lib/details"
import { buildOrderMessage } from "../lib/order-message"
import { useCopy } from "@/hooks/use-copy"
import type { OrderTotals, ShippingDetails } from "../types"

const list = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function SuccessMark() {
  const reduceMotion = useReducedMotion()
  const draw = (delay: number) => ({
    animate: { pathLength: 1 },
    initial: reduceMotion ? false : { pathLength: 0 },
    transition: { delay, duration: 0.5 },
  })

  return (
    <svg
      aria-hidden="true"
      className="size-14 text-success-600 dark:text-success-300"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={3}
      viewBox="0 0 52 52"
    >
      <motion.circle cx="26" cy="26" r="23" {...draw(0)} />
      <motion.path d="M15 27l8 8 14-16" {...draw(0.35)} />
    </svg>
  )
}

interface OptionProps {
  description: string
  icon: ReactNode
  iconClass: string
  link: ChannelLink | null
  onActivate: (link: ChannelLink) => void
  title: string
}

function Option({
  description,
  icon,
  iconClass,
  link,
  onActivate,
  title,
}: OptionProps) {
  const body = (
    <>
      <span
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl text-white",
          iconClass
        )}
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="text-sm font-extrabold text-ink">{title}</span>
        <span className="text-xs text-muted-foreground">
          {link ? description : checkoutContent.dialog.unavailable}
        </span>
      </span>
    </>
  )

  if (!link) {
    return (
      <motion.div
        aria-disabled="true"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-3.5 opacity-60"
        variants={item}
      >
        {body}
      </motion.div>
    )
  }

  return (
    <motion.a
      className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-sm transition-colors hover:border-primary/50 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
      href={link.href}
      onClick={() => {
        onActivate(link)
      }}
      rel="noreferrer"
      target="_blank"
      transition={{ damping: 28, stiffness: 420, type: "spring" }}
      variants={item}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
    >
      {body}
    </motion.a>
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
  const [opened, setOpened] = useState<ChannelLink | null>(null)
  const { copy: copyText, state } = useCopy()

  const message = useMemo(
    () =>
      buildOrderMessage({
        details: trimDetails(details),
        items,
        totals,
      }),
    [details, items, totals]
  )
  const links = useMemo(
    () =>
      buildChannels(
        message,
        formatMessage(copy.emailSubject, { name: siteConfig.name })
      ),
    [message, copy.emailSubject]
  )

  function activate(link: ChannelLink) {
    if (link.paste) void copyText(message)
    setOpened(link)
  }

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
              <SuccessMark />
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
              animate="show"
              className="grid gap-2.5 sm:grid-cols-3"
              initial="hidden"
              variants={list}
            >
              <Option
                description={copy.email.description}
                icon={<Mail aria-hidden="true" className="size-5" />}
                iconClass="bg-primary"
                link={links.email}
                onActivate={activate}
                title={copy.email.title}
              />
              <Option
                description={copy.whatsapp.description}
                icon={<MessageCircle aria-hidden="true" className="size-5" />}
                iconClass="bg-whatsapp"
                link={links.whatsapp}
                onActivate={activate}
                title={copy.whatsapp.title}
              />
              <Option
                description={copy.telegram.description}
                icon={<Send aria-hidden="true" className="size-5" />}
                iconClass="bg-highlight-600"
                link={links.telegram}
                onActivate={activate}
                title={copy.telegram.title}
              />
            </motion.div>

            {links.email && (
              <div className="mt-3 rounded-xl border border-primary-200/80 bg-primary-50/70 p-3 text-xs leading-5 text-primary-950 dark:border-primary-900/80 dark:bg-primary-950/40 dark:text-primary-100">
                <p className="m-0 flex items-start gap-2">
                  <Info
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0"
                  />
                  {formatMessage(copy.gmailNotice, {
                    email: siteConfig.contact.email,
                  })}
                </p>
                <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 pl-5.5">
                  <span className="font-semibold">{copy.otherMail}</span>
                  {links.outlook && (
                    <a
                      className="font-semibold text-primary-text underline-offset-4 hover:underline"
                      href={links.outlook.href}
                      onClick={() => {
                        if (links.outlook) activate(links.outlook)
                      }}
                      rel="noreferrer"
                      target="_blank"
                    >
                      {copy.outlook}
                    </a>
                  )}
                  {links.mailApp && (
                    <a
                      className="font-semibold text-primary-text underline-offset-4 hover:underline"
                      href={links.mailApp.href}
                      onClick={() => {
                        if (links.mailApp) activate(links.mailApp)
                      }}
                    >
                      {copy.mailApp}
                    </a>
                  )}
                </p>
              </div>
            )}

            {opened ? (opened.paste ? copy.pasteHint : copy.openedHint) : ""}

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
                    transition={{ duration: 0.15 }}
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
            <Button onClick={onFinish} variant="ghost">
              {copy.finishAction}
            </Button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
