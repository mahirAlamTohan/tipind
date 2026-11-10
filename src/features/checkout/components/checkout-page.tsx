"use client"

import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ShoppingBag } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorPanel } from "@/components/error-fallback"
import { ButtonLink } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"
import { selectTotalMills, useCartStore } from "@/features/cart/cart-store"

import { useCheckoutStore } from "../checkout-store"
import { checkoutContent } from "../content"
import { computeTotals } from "../lib/charges"
import type { CheckoutStep } from "../types"
import { CheckoutStepper } from "./checkout-stepper"
import { DetailsForm } from "./details-form"
import { OrderDialog } from "./order-dialog"
import { OrderSummary } from "./order-summary"
import { ReviewStep } from "./review-step"

function Skeleton() {
  return (
    <div
      aria-busy="true"
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]"
      role="status"
    >
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
      <span className="sr-only">{checkoutContent.loading}</span>
    </div>
  )
}

function EmptyCart() {
  return (
    <Card className="mx-auto max-w-lg items-center p-10 text-center">
      <span className="mb-1 grid size-14 place-items-center rounded-2xl border border-primary-100 bg-primary-50 text-primary-text dark:border-primary-900 dark:bg-primary-950">
        <ShoppingBag aria-hidden="true" className="size-6" />
      </span>
      <h2 className="m-0 font-display text-xl font-extrabold text-ink">
        {checkoutContent.emptyTitle}
      </h2>
      <p className="m-0 mb-3 text-sm leading-6 text-muted-foreground">
        {checkoutContent.emptyDescription}
      </p>
      <ButtonLink href="/#catalog">
        {checkoutContent.continueShopping}
      </ButtonLink>
    </Card>
  )
}

export function CheckoutPage() {
  const router = useRouter()
  const reduceMotion = useReducedMotion()
  const items = useCartStore((state) => state.items)
  const cartReady = useCartStore((state) => state.isHydrated)
  const subtotal = useCartStore(selectTotalMills)
  const clearCart = useCartStore((state) => state.actions.clear)
  const details = useCheckoutStore((state) => state.details)
  const step = useCheckoutStore((state) => state.step)
  const formReady = useCheckoutStore((state) => state.isHydrated)
  const clearDetails = useCheckoutStore((state) => state.actions.clearDetails)
  const setStep = useCheckoutStore((state) => state.actions.setStep)
  const [dialogOpen, setDialogOpen] = useState(false)

  // The cart is hydrated by CartRoot; the saved form is hydrated here.
  useEffect(() => {
    void Promise.resolve(useCheckoutStore.persist.rehydrate()).then(() => {
      useCheckoutStore.setState({ isHydrated: true })
    })
  }, [])

  const totals = useMemo(
    () => computeTotals(subtotal, details.country),
    [subtotal, details.country]
  )

  function goTo(next: CheckoutStep) {
    setStep(next)
    window.scrollTo({ behavior: "smooth", top: 0 })
  }

  function finish() {
    clearCart()
    // The buyer is done: do not leave their name, address and email sitting in
    // localStorage on a device we no longer need them on (see the privacy review).
    clearDetails()
    setStep("review")
    setDialogOpen(false)
    // Remove the record itself, not just its fields: an empty envelope left in
    // localStorage is still a hint that someone checked out on this device.
    useCheckoutStore.persist.clearStorage()
    router.push("/")
  }

  const ready = cartReady && formReady
  const current = dialogOpen ? 2 : step === "review" ? 0 : 1

  return (
    <main className="min-h-[70dvh] bg-linear-to-b from-surface-tint to-background pt-8 pb-20 sm:pt-12">
      <Container>
        <div className="mb-6 sm:mb-8">
          <span className="text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
            {checkoutContent.eyebrow}
          </span>
          <h1 className="mt-2 mb-0 font-display text-[clamp(1.9rem,4vw,2.6rem)] leading-tight font-extrabold tracking-[-0.045em] text-ink">
            {checkoutContent.title}
          </h1>
          <p className="mt-2 mb-0 max-w-xl text-sm leading-7 text-muted-foreground">
            {checkoutContent.description}
          </p>
        </div>

        {!ready ? (
          <Skeleton />
        ) : items.length === 0 ? (
          <EmptyCart />
        ) : (
          <>
            <div className="mb-6 max-w-xl">
              <CheckoutStepper current={current} />
            </div>

            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  initial={
                    reduceMotion
                      ? false
                      : { opacity: 0, x: step === "details" ? 24 : -24 }
                  }
                  key={step}
                  transition={{ duration: 0.25 }}
                >
                  {step === "review" ? (
                    <ReviewStep items={items} />
                  ) : (
                    <DetailsForm
                      onValid={() => {
                        setDialogOpen(true)
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>

              <OrderSummary
                items={items}
                onBack={() => {
                  goTo("review")
                }}
                onContinue={() => {
                  goTo("details")
                }}
                step={step}
                totals={totals}
              />
            </div>
          </>
        )}
      </Container>

      {dialogOpen && (
        <ErrorBoundary
          fallback={(reset) => (
            <div className="fixed inset-0 z-90 grid place-items-center overflow-y-auto bg-neutral-950/55 p-4 backdrop-blur-xs">
              <div className="w-full max-w-md rounded-3xl border border-border bg-background p-5 shadow-2xl">
                <ErrorPanel
                  description={siteContent.ui.checkoutCrashedDescription}
                  onRetry={reset}
                  title={siteContent.ui.checkoutCrashedTitle}
                />
                <button
                  className="mx-auto mt-4 block text-xs font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                  onClick={() => {
                    setDialogOpen(false)
                  }}
                  type="button"
                >
                  {checkoutContent.dialog.closeAction}
                </button>
              </div>
            </div>
          )}
          label="order-dialog"
        >
          <OrderDialog
            details={details}
            items={items}
            onClose={() => {
              setDialogOpen(false)
            }}
            onFinish={finish}
            totals={totals}
          />
        </ErrorBoundary>
      )}
    </main>
  )
}
