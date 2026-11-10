"use client"

import { useEffect } from "react"

import { ErrorScreen } from "@/components/error-fallback"
import { siteContent } from "@/config/content"

/** Route-segment boundary: keeps the shell (header, footer, cart) usable. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[tipind] route failed to render", error)
  }, [error])

  return (
    <ErrorScreen
      description={siteContent.ui.errorDescription}
      onRetry={reset}
      title={siteContent.ui.errorTitle}
    />
  )
}
