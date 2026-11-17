"use client"
import { RangeSlider } from "@/components/ui/slider"
import { formatMills } from "@/lib/format"

import { useCatalogStore } from "../store/catalog-store"
import type { PriceRange } from "../types"
import { catalogContent } from "../content"

export function PriceFilter({ bounds }: { bounds: PriceRange }) {
  const copy = catalogContent
  const range = useCatalogStore((state) => state.priceRange) ?? bounds
  const setPriceRange = useCatalogStore((state) => state.actions.setPriceRange)

  return (
    <section className="rounded-2xl border border-border/80 bg-background/75 p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="m-0 text-xs font-extrabold text-ink-soft">
            {copy.priceRangeTitle}
          </h4>
          <p className="m-0 mt-1 text-[0.68rem] text-muted-foreground">
            {copy.priceLimitHelp}
          </p>
        </div>
        <span className="rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-extrabold text-primary-text tabular-nums">
          {formatMills(range[0])} – {formatMills(range[1])}
        </span>
      </div>

      <RangeSlider
        formatValue={formatMills}
        max={bounds[1]}
        maximumLabel={copy.maximumPriceAriaLabel}
        min={bounds[0]}
        minimumLabel={copy.minimumPriceAriaLabel}
        onValueChange={setPriceRange}
        value={range}
      />

      <div className="mt-1 flex justify-between text-[0.62rem] font-semibold text-muted-foreground tabular-nums">
        <span>
          {copy.minimumPriceLabel}: {formatMills(bounds[0])}
        </span>
        <span>
          {copy.maximumPriceLabel}: {formatMills(bounds[1])}
        </span>
      </div>
    </section>
  )
}
