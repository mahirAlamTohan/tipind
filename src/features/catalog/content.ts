import type { CatalogContent } from "./types"

export const catalogContent = {
  eyebrow: "Products Catalog",
  title: "Search our medicine catalog",
  description:
    "Find products by active ingredient, brand, manufacturer or pack size.",
  overline: "product directory",
  cardTitle: "Find the right product",
  cardDescription:
    "Search across full ingredient names, product names, packaging, pricing and manufacturer details.",
  searchLabel: "Search the medicine catalog",
  searchPlaceholder: "Search by ingredient, product, pack…",
  searchHelp:
    "Fuzzy search checks active ingredient, product, pack size, rate and manufacturer.",
  facetSearchAriaLabel: "Search {label} filters",
  loadErrorAdvice:
    "Check the catalog URL in .env.production and rebuild with `npm run catalog:build`.",
  paginationLabel: "Catalog pagination",
  filtersAction: "Filters",
  closeFiltersAction: "Close filters",
  includedFiltersTitle: "Including filters",
  excludedFiltersTitle: "Excluding filters",
  noIncludedFilters: "Tap a pill to include it.",
  noExcludedFilters: "Tap an included pill again to exclude it.",
  facetCycleAriaLabel:
    "{label}. Current state: {mode}. Activate to change the filter state.",
  unselectedLabel: "not selected",
  priceRangeTitle: "Price range",
  priceUnit: "USD",
  minimumPriceLabel: "Minimum",
  maximumPriceLabel: "Maximum",
  minimumPriceAriaLabel: "Minimum price in US dollars",
  maximumPriceAriaLabel: "Maximum price in US dollars",
  priceLimitHelp:
    "Drag the handles or use the arrow keys to adjust the USD range.",
  manufacturerLabel: "Manufacturer",
  packagingLabel: "Packaging",
  includeSelected: "Include",
  excludeSelected: "Exclude",
  selectedCount: "{count} selected",
  facetSearchPlaceholder: "Search {label}…",
  noFacetValues: "No values available in this catalog.",
  noFacetMatches: "No matching values.",
  clearFiltersAction: "Clear filters",
  downloadAction: "Download full catalog",
  openCatalogAction: "View the full product catalog",
  productSingular: "product",
  productPlural: "products",
  searchableProducts: "searchable products",
  tableRegionLabel: "Scrollable product catalog table",
  tableHeadings: {
    product: "Product Name",
    ingredient: "Active Ingredient",
    manufacturer: "Manufacturer",
    packaging: "Packaging",
    rate: "RATE (USD)",
    addToCartButton: "Add to cart",
  },
  status: {
    unconfigured: "No records are available.",
    loading: "Loading the product catalog…",
    loaded: "Catalog loaded: {count} products.",
    error: "Catalog unavailable. No records are displayed.",
    indexing: "Preparing search…",
    searchError: "Search is unavailable. Try again later.",
  },
  addTip: {
    add: {
      title: "Add to cart",
      note: "Adds one packet to your cart.",
    },
    more: {
      title: "{count} in your cart",
      note: "Click to add another packet.",
    },
    unavailable: {
      title: "Can't be added yet",
      note: "No price is listed for this product. Contact us for a quote.",
    },
  },
  facetTip: {
    none: {
      title: "{value}",
      points: [
        "Click once to show only this",
        "Click twice to hide it instead",
      ],
    },
    include: {
      title: "Showing only this",
      points: ["Click again to hide it instead", "Click a third time to clear"],
    },
    exclude: {
      title: "Hiding this",
      note: "Click again to clear the filter.",
    },
  },
  facetHelp: {
    title: "How filters work",
    points: [
      "Click once: show only matching products",
      "Click twice: hide matching products",
      "Click a third time: clear it",
      "Combine as many options as you like",
    ],
  },
  removeFilterTip: { title: "Remove filter", note: "{label}" },
  filtersTip: {
    title: "Narrow the results",
    points: ["Manufacturer", "Packaging", "Price range"],
  },
  clearFiltersTip: {
    title: "Clear filters",
    note: "Resets every filter. Your search text stays.",
  },
  emptyTitle: "No matches",
  emptyDescription:
    "Try another ingredient, product name, manufacturer or pack size.",
  noCatalogRecordsTitle: "No catalog records available",
  noCatalogConfiguredDescription:
    "No versioned catalog file to load product records.",
  noCatalogRecordsDescription:
    "The catalog files loaded, but they contain no product records.",
  noCatalogUnavailableDescription:
    "The catalog, manufacturer, or packaging file could not be fetched or decoded. Check the file URLs, CORS policy and XOR key.",
  removeFilterAriaLabel: "Remove {label} from the {mode} filters",
  noProducts: "No products to display",
  summaryShowing: "Showing",
  summaryOf: "of",
  previousPage: "Prev",
  nextPage: "Next",
  previousPageAriaLabel: "Previous page",
  nextPageAriaLabel: "Next page",
  sourceNote: "",
  addToCartAriaLabel: "Add {product} to your cart",
  addedToCartAnnouncement: "{product} added to your cart.",
  unavailablePriceAriaLabel:
    "Cannot add {product}: a valid USD price is unavailable",
} satisfies CatalogContent
