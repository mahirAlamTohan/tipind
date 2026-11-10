"use client"

import { useEffect } from "react"

import { ErrorScreen } from "@/components/error-fallback"
import { siteContent } from "@/config/content"

/** Checkout-specific copy: the buyer needs to know the cart survived. */
export default function CheckoutError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[tipind] checkout failed to render", error)
  }, [error])

  return (
    <ErrorScreen
      description={siteContent.ui.checkoutCrashedDescription}
      onRetry={reset}
      title={siteContent.ui.checkoutCrashedTitle}
    />
  )
}
