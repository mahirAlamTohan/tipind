"use client"
import { useEffect, useRef, useState } from "react"

import { Card } from "@/components/ui/card"
import { Container } from "@/components/ui/container"
import { siteConfig } from "@/config/site"
import { siteContent } from "@/config/content"
import { formatNumber, pluralize } from "@/lib/format"

import { RESULTS_ANCHOR_ID } from "../constants"
import { useCatalogLoader } from "../hooks/use-catalog-loader"
import { useCatalogResults } from "../hooks/use-catalog-results"
import { getEmptyView, getStatusView } from "../lib/status"
import { useCatalogStore } from "../store/catalog-store"
import { CatalogEmptyState } from "./catalog-empty-state"
import { CatalogFilters } from "./catalog-filters"
import { CatalogStat, CatalogStatusBar } from "./catalog-status"
import { CatalogTable } from "./catalog-table"
import { CatalogToolbar } from "./catalog-toolbar"

/** Load the catalog once the section is this close to the viewport. */
const PRELOAD_MARGIN = "600px"

export function CatalogExplorer() {
  const copy = siteContent.catalog
  const sectionRef = useRef<HTMLElement>(null)
  const [shouldLoad, setShouldLoad] = useState(false)

  // The catalog is the largest transfer on the page and it sits well below the
  // fold, so it must not compete with the first paint. Fetch it when the
  // section gets close instead of on mount.
  useEffect(() => {
    const element = sectionRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShouldLoad(true)
          observer.disconnect()
        }
      },
      { rootMargin: PRELOAD_MARGIN }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
    }
  }, [])

  const status = useCatalogLoader(shouldLoad ? siteConfig.catalog.dataUrl : "")
  const dataset = useCatalogStore((state) => state.dataset)
  const loadError = useCatalogStore((state) => state.error)
  const loadMore = useCatalogStore((state) => state.actions.loadMore) // ← new
  const results = useCatalogResults()

  const scrollRef = useRef<HTMLDivElement>(null)

  const productCount = dataset?.products.length ?? 0
  const view = { productCount, status }
  const statusView = getStatusView(view)
  const emptyView = getEmptyView(view)

  const noun = pluralize(
    results.total,
    copy.productSingular,
    copy.productPlural
  )
  const summary =
    status === "unconfigured" || status === "error"
      ? copy.noCatalogRecordsTitle
      : results.isFiltered
        ? `${formatNumber(results.total)} matching ${noun}`
        : `${formatNumber(results.total)} ${copy.searchableProducts}`

  return (
    <section
      className="bg-linear-to-b from-surface-tint to-background py-16 outline-none sm:py-20 lg:py-24"
      id="catalog"
      // tabIndex lets the skip link move keyboard focus here, not just the
      // scroll position — without it focus falls back to <body>.
      tabIndex={-1}
      ref={sectionRef}
    >
      <Container>
        <div className="mx-auto mb-8 max-w-2xl text-center sm:mb-9">
          <span className="inline-flex items-center justify-center gap-2 text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-xs bg-primary-500 shadow-[0_0_0_4px_var(--color-primary-100)] dark:shadow-[0_0_0_4px_var(--color-primary-900)]"
            />
            {copy.eyebrow}
          </span>
          <h2 className="mt-3 font-display text-[clamp(1.95rem,4vw,2.7rem)] leading-tight font-extrabold tracking-[-0.045em] text-ink">
            {copy.title}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
            {copy.description}
          </p>
        </div>

        <Card className="gap-0 py-0 shadow-soft">
          <div className="flex flex-col justify-between gap-4 px-5 pt-5 pb-4 sm:flex-row sm:items-center sm:px-7 sm:pt-6">
            <div>
              <span className="text-[0.62rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
                {copy.overline}
              </span>
              <h3 className="my-1 font-display text-lg font-bold tracking-tight text-ink sm:text-xl">
                {copy.cardTitle}
              </h3>
              <p className="m-0 max-w-xl text-xs leading-5 text-muted-foreground">
                {copy.cardDescription}
              </p>
            </div>
            <CatalogStat count={productCount} status={status} />
          </div>

          <CatalogToolbar />
          <CatalogFilters dataset={dataset} matchCount={results.total} />
          <CatalogStatusBar
            message={statusView.message}
            summary={summary}
            tone={statusView.tone}
          />

          {status === "error" && (
            <p
              className="m-0 px-5 pb-3 text-[0.68rem] text-danger-700 sm:px-7 dark:text-danger-300"
              role="status"
            >
              {loadError} {copy.loadErrorAdvice}
            </p>
          )}

          <div
            className="@container max-h-[75vh] overflow-y-auto"
            id={RESULTS_ANCHOR_ID}
            ref={scrollRef}
          >
            {results.rows.length > 0 ? (
              <CatalogTable
                hasMore={results.hasMore}
                onLoadMore={loadMore}
                query={results.query}
                rows={results.rows}
                scrollRef={scrollRef}
              />
            ) : (
              <CatalogEmptyState
                busy={status === "loading"}
                description={emptyView.description}
                title={emptyView.title}
              />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex min-h-12 items-center justify-between border-t border-border bg-neutral-50/70 px-5 py-3 sm:px-7 dark:bg-neutral-950/25">
            <p className="m-0 text-[0.68rem] text-muted-foreground">
              {results.total > 0 ? (
                <>
                  Showing{" "}
                  <strong className="text-ink-soft">
                    {formatNumber(results.loadedCount)}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-ink-soft">
                    {formatNumber(results.total)}
                  </strong>{" "}
                  {results.isFiltered ? `matching ${noun}` : noun}
                </>
              ) : (
                copy.noProducts
              )}
            </p>
            {!results.hasMore && results.total > 0 && (
              <span className="text-[0.62rem] font-semibold text-muted-foreground">
                All loaded ✓
              </span>
            )}
          </div>
        </Card>

        {copy.sourceNote && (
          <p className="mt-3 text-right text-[0.62rem] leading-5 text-muted-foreground sm:px-1 sm:text-xs">
            {copy.sourceNote}
          </p>
        )}
      </Container>
    </section>
  )
}
