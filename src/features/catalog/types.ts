export interface CatalogProduct {
  /** Equals the product's index in `CatalogDataset.products`. */
  readonly id: number
  readonly name: string
  readonly ingredient: string
  readonly manufacturer: string
  readonly packaging: string
  /** Dosage form / unit type (e.g. "tablet", "capsule", "injection"). */
  readonly type: string
  /** Price in mills (1/1000 USD). Null when the source has no usable price. */
  readonly priceMills: number | null
}

/** [min, max] in mills. */
export type PriceRange = readonly [number, number]

export interface CatalogDataset {
  readonly products: readonly CatalogProduct[]
  readonly manufacturers: readonly string[]
  readonly packaging: readonly string[]
  readonly types: readonly string[]
  readonly priceBounds: PriceRange
}

export type CatalogLoadStatus = "unconfigured" | "loading" | "ready" | "error"
export type FacetKind = "manufacturer" | "packaging"
export type FilterMode = "include" | "exclude"
export type FacetSelection = ReadonlyMap<string, FilterMode>

export interface SearchQuery {
  /** Lowercased, accent-free words. */
  readonly terms: readonly string[]
  /** The words joined without separators; only set for multi-word queries. */
  readonly compact: string
}

export interface CatalogResults {
  readonly rows: readonly CatalogProduct[]
  readonly query: SearchQuery
  readonly total: number
  readonly hasMore: boolean
  readonly loadedCount: number
  readonly isFiltered: boolean
}

export interface CatalogContent {
  eyebrow: string
  title: string
  description: string
  overline: string
  cardTitle: string
  cardDescription: string
  searchLabel: string
  searchPlaceholder: string
  searchHelp: string
  facetSearchAriaLabel: string
  loadErrorAdvice: string
  noCatalogRecordsTitle: string
  paginationLabel: string
  filtersAction: string
  closeFiltersAction: string
  includedFiltersTitle: string
  excludedFiltersTitle: string
  noIncludedFilters: string
  noExcludedFilters: string
  facetCycleAriaLabel: string
  unselectedLabel: string
  priceRangeTitle: string
  priceUnit: string
  minimumPriceLabel: string
  maximumPriceLabel: string
  minimumPriceAriaLabel: string
  maximumPriceAriaLabel: string
  priceLimitHelp: string
  manufacturerLabel: string
  packagingLabel: string
  includeSelected: string
  excludeSelected: string
  selectedCount: string
  facetSearchPlaceholder: string
  noFacetValues: string
  noFacetMatches: string
  clearFiltersAction: string
  downloadAction: string
  openCatalogAction: string
  productSingular: string
  productPlural: string
  searchableProducts: string
  tableRegionLabel: string
  tableHeadings: {
    product: string
    ingredient: string
    manufacturer: string
    packaging: string
    rate: string
    addToCartButton: string
  }
  status: {
    unconfigured: string
    loading: string
    loaded: string
    error: string
    indexing: string
    searchError: string
  }
  addTip: {
    add: { title: string; note: string }
    more: {
      title: string
      note: string
    }
    unavailable: {
      title: string
      note: string
    }
  }
  facetTip: {
    none: {
      title: string
      points: string[]
    }
    include: {
      title: string
      points: string[]
    }
    exclude: {
      title: string
      note: string
    }
  }
  facetHelp: {
    title: string
    points: string[]
  }
  removeFilterTip: { title: string; note: string }
  filtersTip: {
    title: string
    points: string[]
  }
  clearFiltersTip: {
    title: string
    note: string
  }
  emptyTitle: string
  emptyDescription: string
  noCatalogConfiguredDescription: string
  noCatalogRecordsDescription: string
  noCatalogUnavailableDescription: string
  removeFilterAriaLabel: string
  noProducts: string
  summaryShowing: string
  summaryOf: string
  previousPage: string
  nextPage: string
  previousPageAriaLabel: string
  nextPageAriaLabel: string
  sourceNote: string
  addToCartAriaLabel: string
  addedToCartAnnouncement: string
  unavailablePriceAriaLabel: string
}
