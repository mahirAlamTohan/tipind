"use client"

import { siteContent } from "@/config/content"
import { formatMessage, formatNumber, pluralize } from "@/lib/format"

import { useCatalogStore } from "../store/catalog-store"
import type { CatalogDataset } from "../types"
import { FacetFilter } from "./facet-filter"
import { PriceFilter } from "./price-filter"
import { SelectionSummary } from "./selection-summary"

interface CatalogFiltersProps {
  dataset: CatalogDataset | null
  matchCount: number
}

export function CatalogFilters({ dataset, matchCount }: CatalogFiltersProps) {
  const copy = siteContent.catalog
  const open = useCatalogStore((state) => state.filtersOpen)
  const selectedCount = useCatalogStore(
    (state) => state.manufacturer.size + state.packaging.size
  )
  return (
    <>
      {open && dataset && (
        <div className="filters-panel overflow-hidden">
          <div
            aria-label={copy.filtersAction}
            className="space-y-5 border-y border-border bg-neutral-50/80 p-5 sm:px-7 dark:bg-neutral-950/30"
            id="catalog-filters"
            role="region"
          >
            <div className="grid min-w-0 gap-5 xl:grid-cols-2">
              <FacetFilter
                kind="manufacturer"
                label={copy.manufacturerLabel}
                layout="list"
                options={dataset.manufacturers}
              />
              <FacetFilter
                kind="packaging"
                label={copy.packagingLabel}
                layout="pills"
                options={dataset.packaging}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SelectionSummary mode="include" />
              <SelectionSummary mode="exclude" />
            </div>

            <PriceFilter bounds={dataset.priceBounds} />

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 pt-3">
              <p
                aria-live="polite"
                className="m-0 text-xs font-semibold text-muted-foreground"
              >
                {formatNumber(matchCount)} matching{" "}
                {pluralize(
                  matchCount,
                  copy.productSingular,
                  copy.productPlural
                )}
              </p>
              <p className="m-0 text-[0.62rem] text-muted-foreground">
                {formatMessage(copy.selectedCount, {
                  count: formatNumber(selectedCount),
                })}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
