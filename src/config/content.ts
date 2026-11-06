import type { SiteContent } from "@/types/content"

export const siteContent = {
  ui: {
    headerIntro: "Your trusted healthcare partner since",
    phoneFallback: "Call our team",
    emailFallback: "Email our team",
    chatAction: "Chat with us",
    themeToggleLabel: "Toggle color theme",
    mainNavigationLabel: "Main navigation",
    mobileNavigationLabel: "Mobile navigation",
    footerNavigationLabel: "Footer navigation",
    contactUsAction: "Contact Us",
    callUsAction: "Call Us",
    emailUsAction: "Email Us",
    closeContactOptionsLabel: "Close contact options",
    contactOptionsLabel: "Contact options",
    offlineNotice:
      "You're offline. Pages and catalog data already saved on this device may still be available.",
    cartAction: "View cart",
    cartCountLabel: "{count} items in your cart",
    cartOpenTooltip: "Open your cart",
    cartCloseTooltip: "Close your cart",
    contactOptionsTooltip: "Call or email our team",
    whatsappTooltip: "Chat with us on WhatsApp",
  },
  hero: {
    eyebrow: "Trusted healthcare partner since",
    title: "Quality medicines.",
    titleAccent: "Better healthcare.",
    description:
      "Quality medicines support better healthcare. We provide reliable access to generic and ethical-brand products, backed by thoughtful service and international shipping from India.",
    proofPrimary: "Quality focused",
    proofSecondary: "Worldwide shipping",
    imageBadge: "Carefully sourced healthcare",
    imageAlt: "Medicine bottles image.",
    contactEyebrow: "Here for your healthcare needs",
    contactDescription:
      "For product availability and orders, contact our team directly.",
    primaryAction: "Talk to our team",
    secondaryAction: "Explore catalog",
    whatsappAction: "WhatsApp us",
    emailAction: "Email us",
  },
  catalog: {
    eyebrow: "Pharmaceutical Catalog",
    title: "Search the medicine catalog",
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
    fullCatalogLabel: "full catalog",
    searchNowLabel: "loading catalog",
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
        points: [
          "Click again to hide it instead",
          "Click a third time to clear",
        ],
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
  },
  faq: {
    eyebrow: "Good to know",
    title: "Frequently asked questions",
    description:
      "Find answers to common questions about our pharmaceutical catalog, products, downloads and supply.",
    contactPrompt: "Still have a question? Get in touch",
    items: [
      {
        question: "How can I pay?",
        answer:
          "Our preferred payment methods are Bitcoin (BTC), USDT (ERC-20), USDT (TRC-20), Ethereum (ETH), and USDC (ERC-20).",
      },
      {
        question: "How do you ship, and where are orders shipped from?",
        answer:
          "Packages are dispatched from India using India Post or another postal service, depending on the circumstances. Customs declarations are made according to the applicable shipping and customs requirements at the time of dispatch.",
      },
      {
        question:
          "What should I do if my order is missing an item or I receive a different brand?",
        answer:
          "Please contact us so we can review the order. If an item was omitted during fulfillment, we will arrange to send it promptly or, with your approval, include it with your next order. If a product is unavailable, we may offer an alternative of equivalent or higher value.",
      },
      {
        question: "Why hasn't my tracking information been updated?",
        answer:
          "International shipments can sometimes go for up to two weeks without a tracking update. We will do our best to help with tracking inquiries, but scans and delivery updates ultimately depend on the postal and logistics services handling the shipment.",
      },
      {
        question: "What is your reshipment policy?",
        answer:
          "All purchases are final and refunds are not offered. For eligible international orders, a reshipment may be considered when a shipment is confirmed as seized with appropriate documentation, appears lost in transit, or has had no tracking update for more than 20 days. Store credit may be offered in some circumstances.",
      },
      {
        question: "What happens if a reshipment is also seized?",
        answer:
          "Refunds are not offered if a replacement shipment is subsequently seized. Depending on the circumstances, we may offer the affected products at base cost for another attempt.",
      },
      {
        question: "Which countries are you currently shipping to?",
        answer:
          "We currently ship only to the USA, UK, New Zealand, and Australia. At present, we do not ship to European countries or Canada.",
      },
      {
        question: "How long does processing and delivery take?",
        answer:
          "Please allow 2–5 business days for your order to be packaged and dispatched. International delivery typically takes approximately 2–3 weeks, though transit times vary. We recommend allowing at least four weeks before submitting a delivery-related complaint.",
      },
      {
        question: "Is there a minimum order quantity?",
        answer:
          "There is no minimum order quantity. Orders can be placed for any quantity offered in the catalog.",
      },
      {
        question: "Do I need to sign for my package?",
        answer:
          "A signature may be required by the local delivery service. Please follow the delivery requirements applicable to your shipment and contact the carrier if you have questions about a signature request.",
      },
      {
        question: "Do I need to use my real name on the shipping address?",
        answer:
          "Please provide accurate recipient and delivery information. Inaccurate or misleading information may cause delays or delivery problems, so make sure the name and address are sufficient for successful delivery.",
      },
    ],
  },
  about: {
    eyebrow: "About {name}",
    title: "Reliable healthcare supply, built on trust.",
    description:
      "{name} has supplied generic medicines and ethical-brand medications from India since {founded}, with a focus on reliable service, competitive pricing and international shipping.",
    highlights: ["Quality focused", "International support"],
    sinceLabel: "Serving customers since",
    serviceTitle: "International shipping",
    serviceRegions: "USA · UK · New Zealand · Australia",
    serviceDescription: "Thoughtful service and dependable healthcare supply.",
  },
  contact: {
    eyebrow: "Contact our team",
    title: "We’re here to help you find what you need.",
    description:
      "Questions about products or orders? Contact our team by WhatsApp or email. We're here to help.",
    whatsappLabel: "Message on WhatsApp",
    phoneLabel: "Phone / WhatsApp",
    emailLabel: "Email",
    supportHoursLabel: "Support hours",
    phoneFallback: "Contact us",
    emailFallback: "Email our team",
    supportHoursFallback: "Contact us for current hours",
    supportCallout: "Here to help",
  },
  footer: {
    kicker: "Reliable Healthcare Supply",
    description:
      "{name} has supplied generic medicines and ethical-brand medications from India since {founded}, with a focus on reliable service, competitive pricing and international shipping.",
    navigationHeading: "Quick links",
    contactHeading: "Contact us",
    serviceItems: [
      {
        title: "Responsive Support",
        description: "Assistance for your queries",
      },
      {
        title: "International Shipping",
        description: "USA · UK · New Zealand · Australia",
      },
      {
        title: "Quality Focused",
        description: "Reliable pharmaceutical supply",
      },
    ],
    noticeHeading: "Important notice",
    notice:
      "Information on this website is for general informational purposes only and should not replace professional medical advice. Prescription medicines should be used only under the guidance of a qualified healthcare professional.",
    supportLink: "Contact support",
  },
} satisfies SiteContent
