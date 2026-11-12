import { create } from "zustand"

import type {
  CatalogDataset,
  CatalogLoadStatus,
  FacetKind,
  FacetSelection,
  FilterMode,
  PriceRange,
} from "../types"
import { PAGE_SIZE } from "../constants"

interface CatalogActions {
  loadStarted: () => void
  loadSucceeded: (dataset: CatalogDataset) => void
  loadFailed: (message: string) => void
  setQuery: (query: string) => void
  loadMore: () => void
  toggleFilters: () => void
  cycleFacet: (kind: FacetKind, value: string) => void
  removeFacet: (kind: FacetKind, value: string) => void
  setPriceRange: (range: PriceRange) => void
  clearFilters: () => void
}

export interface CatalogState {
  status: CatalogLoadStatus
  error: string
  dataset: CatalogDataset | null
  query: string
  loadedCount: number
  filtersOpen: boolean
  manufacturer: FacetSelection
  packaging: FacetSelection
  /** Null means the full range (no price filter). */
  priceRange: PriceRange | null
  actions: CatalogActions
}

const FILTER_DEFAULTS = {
  manufacturer: new Map<string, FilterMode>(),
  packaging: new Map<string, FilterMode>(),
  loadedCount: PAGE_SIZE,
  priceRange: null as PriceRange | null,
}

function nextMode(current: FilterMode | undefined): FilterMode | undefined {
  if (current === undefined) return "include"
  return current === "include" ? "exclude" : undefined
}

function withMode(
  selection: FacetSelection,
  value: string,
  mode: FilterMode | undefined
): FacetSelection {
  const next = new Map(selection)
  if (mode) next.set(value, mode)
  else next.delete(value)
  return next
}

function patchFacet(
  state: CatalogState,
  kind: FacetKind,
  change: (selection: FacetSelection) => FacetSelection
): Partial<CatalogState> {
  return kind === "manufacturer"
    ? { manufacturer: change(state.manufacturer), loadedCount: PAGE_SIZE }
    : { packaging: change(state.packaging), loadedCount: PAGE_SIZE }
}

export const useCatalogStore = create<CatalogState>()((set) => ({
  status: "loading",
  error: "",
  dataset: null,
  query: "",
  filtersOpen: false,
  ...FILTER_DEFAULTS,

  actions: {
    loadStarted: () => {
      set({ status: "loading", error: "" })
    },
    loadSucceeded: (dataset) => {
      set({
        manufacturer: new Map<string, FilterMode>(),
        packaging: new Map<string, FilterMode>(),
        loadedCount: PAGE_SIZE,
        priceRange: null,
        dataset,
        error: "",
        status: "ready",
      })
    },
    loadFailed: (message) => {
      set({ dataset: null, error: message, status: "error" })
    },
    setQuery: (query) => {
      set({ loadedCount: PAGE_SIZE, query }) // ← reset on search
    },
    loadMore: () => {
      set((state) => ({ loadedCount: state.loadedCount + PAGE_SIZE }))
    },
    toggleFilters: () => {
      set((state) => ({ filtersOpen: !state.filtersOpen }))
    },
    cycleFacet: (kind, value) => {
      set((state) =>
        patchFacet(state, kind, (selection) =>
          withMode(selection, value, nextMode(selection.get(value)))
        )
      )
    },
    removeFacet: (kind, value) => {
      set((state) =>
        patchFacet(state, kind, (selection) =>
          withMode(selection, value, undefined)
        )
      )
    },
    setPriceRange: (range) => {
      set((state) => {
        const bounds = state.dataset?.priceBounds
        const isFull =
          !bounds || (range[0] <= bounds[0] && range[1] >= bounds[1])
        // Resetting the page is what the facet filters do too. This used to
        // write `page`, a key that does not exist on CatalogState, so the
        // price filter never reset pagination and Zustand kept a stray key.
        return { loadedCount: PAGE_SIZE, priceRange: isFull ? null : range }
      })
    },
    clearFilters: () => {
      set({
        manufacturer: new Map<string, FilterMode>(),
        packaging: new Map<string, FilterMode>(),
        loadedCount: PAGE_SIZE,
        priceRange: null,
      })
    },
  },
}))

export const selectFacet = (state: CatalogState, kind: FacetKind) =>
  kind === "manufacturer" ? state.manufacturer : state.packaging

export const selectActiveFilterCount = (state: CatalogState) =>
  state.manufacturer.size + state.packaging.size + (state.priceRange ? 1 : 0)
