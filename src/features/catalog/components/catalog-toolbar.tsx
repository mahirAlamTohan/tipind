"use client"
import { RotateCcw, SlidersHorizontal, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { SearchField } from "@/components/ui/search-field"
import { Tooltip } from "@/components/ui/tooltip"

import {
  selectActiveFilterCount,
  useCatalogStore,
} from "../store/catalog-store"
import { catalogContent } from "../content"

export function CatalogToolbar() {
  const copy = catalogContent
  const query = useCatalogStore((state) => state.query)
  const filtersOpen = useCatalogStore((state) => state.filtersOpen)
  const activeCount = useCatalogStore(selectActiveFilterCount)
  const { clearFilters, setQuery, toggleFilters } = useCatalogStore(
    (state) => state.actions
  )

  return (
    <div className="flex flex-col gap-3 px-5 pb-4 sm:px-7">
      <SearchField
        aria-describedby="catalog-search-help"
        label={copy.searchLabel}
        onValueChange={setQuery}
        placeholder={copy.searchPlaceholder}
        value={query}
      />
      <p className="sr-only" id="catalog-search-help">
        {copy.searchHelp}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Tooltip content={copy.filtersTip}>
          <Button
            aria-controls="catalog-filters"
            aria-expanded={filtersOpen}
            className="h-10 px-3.5 text-xs"
            onClick={toggleFilters}
            size="sm"
            variant="outline"
          >
            {filtersOpen ? (
              <X aria-hidden="true" />
            ) : (
              <SlidersHorizontal aria-hidden="true" />
            )}
            {filtersOpen ? copy.closeFiltersAction : copy.filtersAction}
            {activeCount > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1 text-[0.62rem] font-extrabold text-primary-foreground">
                {activeCount}
              </span>
            )}
          </Button>
        </Tooltip>

        <Tooltip content={copy.clearFiltersTip} wrap>
          <Button
            className="h-10 px-3.5 text-xs text-muted-foreground"
            disabled={activeCount === 0}
            onClick={clearFilters}
            size="sm"
            variant="outline"
          >
            <RotateCcw aria-hidden="true" />
            {copy.clearFiltersAction}
          </Button>
        </Tooltip>
      </div>
    </div>
  )
}
