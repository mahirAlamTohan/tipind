"use client"

import { useDeferredValue, useMemo, useState } from "react"
import { cva } from "class-variance-authority"
import { CircleCheck, CircleMinus, Info, Plus } from "lucide-react"

import { SearchField } from "@/components/ui/search-field"
import { formatTip, Tooltip } from "@/components/ui/tooltip"
import { VirtualList } from "@/components/ui/virtual-list"
import { siteContent } from "@/config/content"
import { compactText, formatMessage, formatNumber } from "@/lib/format"

import { selectFacet, useCatalogStore } from "../store/catalog-store"
import type { FacetKind, FilterMode } from "../types"

const ROW_HEIGHT = 44
const LIST_HEIGHT = 288

const optionStyles = cva(
  "inline-flex min-w-0 items-center gap-2 border text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-ring",
  {
    variants: {
      layout: {
        list: "h-10 w-full rounded-lg px-3",
        pills: "min-h-9 max-w-full rounded-full px-3 py-1.5",
      },
      mode: {
        none: "border-border bg-background text-ink-soft hover:border-primary/45 hover:bg-accent",
        include:
          "border-primary bg-primary text-primary-foreground hover:bg-primary-700",
        exclude:
          "border-tertiary-600 bg-tertiary-600 text-white hover:bg-tertiary-700",
      },
    },
  }
)

function ModeIcon({ mode }: { mode: FilterMode | undefined }) {
  const className = "size-3.5 shrink-0"
  if (mode === "include") {
    return <CircleCheck aria-hidden="true" className={className} />
  }
  if (mode === "exclude") {
    return <CircleMinus aria-hidden="true" className={className} />
  }
  return <Plus aria-hidden="true" className={className} />
}

interface FacetOption {
  /** Label without spaces or punctuation, for matching. */
  key: string
  label: string
}

interface FacetFilterProps {
  kind: FacetKind
  label: string
  layout: "list" | "pills"
  options: readonly string[]
}

export function FacetFilter({
  kind,
  label,
  layout,
  options,
}: FacetFilterProps) {
  const copy = siteContent.catalog
  const [search, setSearch] = useState("")
  const deferredSearch = useDeferredValue(search)
  const selection = useCatalogStore((state) => selectFacet(state, kind))
  const cycleFacet = useCatalogStore((state) => state.actions.cycleFacet)

  const indexed = useMemo<FacetOption[]>(
    () =>
      options.map((option) => ({ key: compactText(option), label: option })),
    [options]
  )

  // "as life" -> "aslife", which matches "A. S Lifesciences".
  // Options that start with the text come first.
  const visible = useMemo(() => {
    const needle = compactText(deferredSearch)
    if (!needle) return indexed

    const starts: FacetOption[] = []
    const contains: FacetOption[] = []
    for (const option of indexed) {
      if (option.key.startsWith(needle)) starts.push(option)
      else if (option.key.includes(needle)) contains.push(option)
    }
    return [...starts, ...contains]
  }, [indexed, deferredSearch])

  function renderOption(option: FacetOption) {
    const mode = selection.get(option.label)
    const modeLabel =
      mode === "include"
        ? copy.includeSelected
        : mode === "exclude"
          ? copy.excludeSelected
          : copy.unselectedLabel
    const tip = formatTip(
      mode === "include"
        ? copy.facetTip.include
        : mode === "exclude"
          ? copy.facetTip.exclude
          : copy.facetTip.none,
      { value: option.label }
    )

    return (
      <Tooltip content={tip}>
        <button
          aria-label={formatMessage(copy.facetCycleAriaLabel, {
            label: `${label}: ${option.label}`,
            mode: modeLabel,
          })}
          aria-pressed={mode !== undefined}
          className={optionStyles({ layout, mode: mode ?? "none" })}
          onClick={() => {
            cycleFacet(kind, option.label)
          }}
          type="button"
        >
          <ModeIcon mode={mode} />
          <span className="min-w-0 truncate text-left">{option.label}</span>
          {mode && (
            <span className="ml-auto rounded-full bg-white/20 px-1.5 py-0.5 text-[0.54rem] font-extrabold tracking-wide uppercase">
              {modeLabel}
            </span>
          )}
        </button>
      </Tooltip>
    )
  }

  const panel = "rounded-xl border border-border/80 bg-background/55 p-2"

  return (
    <fieldset className="min-w-0 space-y-2.5">
      <legend className="flex w-full items-center justify-between gap-2 text-xs font-extrabold text-ink-soft">
        <span className="inline-flex items-center gap-1.5">
          {label}
          <Tooltip content={copy.facetHelp}>
            <button
              className="grid size-5 place-items-center rounded-full text-muted-foreground transition-colors hover:text-primary-text focus-visible:outline-2 focus-visible:outline-ring"
              type="button"
            >
              <Info aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
        </span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[0.62rem] font-bold text-primary-text">
          {formatMessage(copy.selectedCount, {
            count: formatNumber(selection.size),
          })}
        </span>
      </legend>

      <SearchField
        label={formatMessage(copy.facetSearchAriaLabel, { label })}
        onValueChange={setSearch}
        placeholder={formatMessage(copy.facetSearchPlaceholder, { label })}
        size="sm"
        value={search}
      />

      {visible.length === 0 ? (
        <p
          className={`${panel} m-0 px-3 py-5 text-center text-xs text-muted-foreground`}
        >
          {options.length === 0 ? copy.noFacetValues : copy.noFacetMatches}
        </p>
      ) : layout === "list" ? (
        <VirtualList
          className={panel}
          getKey={(option) => option.label}
          height={LIST_HEIGHT}
          itemHeight={ROW_HEIGHT}
          items={visible}
          key={deferredSearch}
          renderItem={(option) => (
            <div className="py-0.5">{renderOption(option)}</div>
          )}
        />
      ) : (
        <div className={`${panel} max-h-40 overflow-y-auto`}>
          <div className="flex flex-wrap gap-2">
            {visible.map((option) => (
              <div className="max-w-full" key={option.label}>
                {renderOption(option)}
              </div>
            ))}
          </div>
        </div>
      )}
    </fieldset>
  )
}
