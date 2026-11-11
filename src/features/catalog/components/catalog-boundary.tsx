"use client"

import type { ReactNode } from "react"

import { ErrorBoundary } from "@/components/error-boundary"
import { ErrorPanel } from "@/components/error-fallback"
import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"

/**
 * Client wrapper for the catalog island. It lives in its own component so the
 * server page can render it: a render-prop `fallback` cannot cross the
 * server/client boundary, so the fallback is built here instead.
 */
export function CatalogBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={(reset) => (
        <section
          className="bg-linear-to-b from-surface-tint to-background py-16 sm:py-20 lg:py-24"
          id="catalog"
        >
          <Container>
            <ErrorPanel
              description={siteContent.ui.catalogCrashedDescription}
              onRetry={reset}
              title={siteContent.ui.catalogCrashedTitle}
            />
          </Container>
        </section>
      )}
      label="catalog"
    >
      {children}
    </ErrorBoundary>
  )
}
