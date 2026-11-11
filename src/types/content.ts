export interface FAQItem {
  question: string
  answer: string
}

export interface SiteContent {
  ui: {
    headerIntro: string
    phoneFallback: string
    emailFallback: string
    chatAction: string
    themeToggleLabel: string
    mainNavigationLabel: string
    mobileNavigationLabel: string
    footerNavigationLabel: string
    contactUsAction: string
    callUsAction: string
    emailUsAction: string
    closeContactOptionsLabel: string
    contactOptionsLabel: string
    offlineNotice: string
    cartAction: string
    cartOpenTooltip: string
    cartCloseTooltip: string
    contactOptionsTooltip: string
    whatsappTooltip: string
    errorTitle: string
    errorDescription: string
    errorRetry: string
    errorHome: string
    catalogCrashedTitle: string
    catalogCrashedDescription: string
    cartCrashedTitle: string
    cartCrashedDescription: string
    checkoutCrashedTitle: string
    checkoutCrashedDescription: string
  }
  hero: {
    eyebrow: string
    title: string
    titleAccent: string
    description: string
    proofPrimary: string
    proofSecondary: string
    imageBadge: string
    imageAlt: string
    contactEyebrow: string
    contactDescription: string
    primaryAction: string
    secondaryAction: string
    whatsappAction: string
    emailAction: string
  }
  catalog: {
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
    fullCatalogLabel: string
    searchNowLabel: string
    loadErrorAdvice: string
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
    noCatalogRecordsTitle: string
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
  faq: {
    eyebrow: string
    title: string
    description: string
    contactPrompt: string
    items: FAQItem[]
  }
  about: {
    eyebrow: string
    title: string
    description: string
    highlights: string[]
    sinceLabel: string
    serviceTitle: string
    serviceRegions: string
    serviceDescription: string
  }
  contact: {
    eyebrow: string
    title: string
    description: string
    whatsappLabel: string
    phoneLabel: string
    emailLabel: string
    supportHoursLabel: string
    phoneFallback: string
    emailFallback: string
    supportHoursFallback: string
    supportCallout: string
  }
  footer: {
    kicker: string
    description: string
    navigationHeading: string
    contactHeading: string
    serviceItems: {
      title: string
      description: string
    }[]
    noticeHeading: string
    notice: string
    supportLink: string
  }
}
