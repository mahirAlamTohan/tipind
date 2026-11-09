"use client"

import { useMemo } from "react"
import { cva } from "class-variance-authority"
import { CircleCheck, CircleMinus, X } from "lucide-react"

import { formatTip, Tooltip } from "@/components/ui/tooltip"
import { siteContent } from "@/config/content"
import { formatMessage, formatNumber } from "@/lib/format"

import { useCatalogStore } from "../store/catalog-store"
import type { FacetKind, FacetSelection, FilterMode } from "../types"

const chipStyles = cva(
  "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-left text-[0.65rem] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
  {
    variants: {
      mode: {
        include:
          "border-primary/25 bg-primary/10 text-primary-text hover:border-primary/45 hover:bg-primary/15",
        exclude:
          "border-tertiary-500/25 bg-tertiary-500/10 text-tertiary-800 hover:border-tertiary-500/45 hover:bg-tertiary-500/15 dark:text-tertiary-200",
      },
    },
  }
)

interface Chip {
  kind: FacetKind
  label: string
  value: string
}

function chipsFor(
  kind: FacetKind,
  heading: string,
  selection: FacetSelection,
  mode: FilterMode
): Chip[] {
  return Array.from(selection)
    .filter(([, selected]) => selected === mode)
    .map(([value]) => ({ kind, label: `${heading}: ${value}`, value }))
}

export function SelectionSummary({ mode }: { mode: FilterMode }) {
  const copy = siteContent.catalog
  const manufacturer = useCatalogStore((state) => state.manufacturer)
  const packaging = useCatalogStore((state) => state.packaging)
  const removeFacet = useCatalogStore((state) => state.actions.removeFacet)

  const chips = useMemo(
    () => [
      ...chipsFor("manufacturer", copy.manufacturerLabel, manufacturer, mode),
      ...chipsFor("packaging", copy.packagingLabel, packaging, mode),
    ],
    [copy.manufacturerLabel, copy.packagingLabel, manufacturer, packaging, mode]
  )

  const isInclude = mode === "include"
  const title = isInclude
    ? copy.includedFiltersTitle
    : copy.excludedFiltersTitle
  const emptyMessage = isInclude
    ? copy.noIncludedFilters
    : copy.noExcludedFilters
  const Icon = isInclude ? CircleCheck : CircleMinus

  return (
    <section
      aria-label={title}
      className="min-w-0 rounded-2xl border border-border/80 bg-background/60 p-3.5"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h5 className="m-0 inline-flex items-center gap-2 text-xs font-extrabold text-ink-soft">
          <Icon
            aria-hidden="true"
            className={
              isInclude
                ? "size-4 text-primary-text"
                : "size-4 text-tertiary-500"
            }
          />
          {title}
        </h5>
        <span className="text-[0.62rem] font-semibold text-muted-foreground">
          {formatNumber(chips.length)}
        </span>
      </div>

      {chips.length > 0 ? (
        <div className="flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
          {chips.map((chip) => (
            <Tooltip
              content={formatTip(copy.removeFilterTip, { label: chip.label })}
              key={`${chip.kind}:${chip.value}`}
            >
              <button
                aria-label={formatMessage(copy.removeFilterAriaLabel, {
                  label: chip.label,
                  mode: isInclude ? "included" : "excluded",
                })}
                className={chipStyles({ mode })}
                onClick={() => {
                  removeFacet(chip.kind, chip.value)
                }}
                type="button"
              >
                <span className="truncate">{chip.label}</span>
                <X aria-hidden="true" className="size-3 shrink-0" />
              </button>
            </Tooltip>
          ))}
        </div>
      ) : (
        <p className="m-0 min-h-7 text-[0.68rem] leading-5 text-muted-foreground">
          {emptyMessage}
        </p>
      )}
    </section>
  )
}
