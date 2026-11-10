"use client"

import { useEffect } from "react"
import { AlertTriangle, RotateCcw } from "lucide-react"

import { siteContent } from "@/config/content"

const copy = siteContent.ui

/**
 * Shown when the sidebar crashes. The layout sets `data-cart="open"` before it
 * renders, so the fallback clears that offset — otherwise the page would stay
 * shifted with no panel to justify it.
 */
export function CartFallback() {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.cart = "closed"
    root.style.removeProperty("--cart-width")
  }, [])

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 mx-auto max-w-sm rounded-2xl border border-danger-200 bg-background p-4 shadow-xl dark:border-danger-900"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-danger-50 text-danger-700 dark:bg-danger-950 dark:text-danger-300">
          <AlertTriangle aria-hidden="true" className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="m-0 text-sm font-bold text-ink">
            {copy.cartCrashedTitle}
          </p>
          <p className="mt-1 mb-0 text-xs leading-5 text-muted-foreground">
            {copy.cartCrashedDescription}
          </p>
          <button
            className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            onClick={() => {
              window.location.reload()
            }}
            type="button"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" />
            {copy.errorRetry}
          </button>
        </div>
      </div>
    </div>
  )
}
