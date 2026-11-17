/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SITE CONFIGURATION — the only file that defines what this business *is*.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  noHtml,
  publicCountryCodes,
  publicSiteUrl,
  publicValue,
  publicYear,
  safeEmail,
  safeTelegram,
} from "@/lib/utils"
import type { SiteConfig } from "@/types/site"
import type { CountryCode } from "libphonenumber-js"

/* ── raw env ──────────────────────────────────────────────────────────────── */

const DEFAULTS = {
  name: "tipind",
  url: "https://tipind.mahiralamtohan.workers.dev",
} as const

const contactEmail = safeEmail(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  "NEXT_PUBLIC_CONTACT_EMAIL"
)
const telegramUsername = safeTelegram(
  process.env.NEXT_PUBLIC_TELEGRAM_USERNAME,
  "NEXT_PUBLIC_TELEGRAM_USERNAME"
)

/* ── where we ship ───────────────────────────────────────────────────────── */

/** Countries you actively ship to, in display order. */
export const DELIVERY_COUNTRIES: readonly CountryCode[] = publicCountryCodes(
  process.env.NEXT_PUBLIC_DELIVERY_COUNTRIES,
  ["GB", "US", "CN", "KR", "JP", "SG", "MY", "TH", "AU", "VN", "CO", "PH"]
)

/** Countries whose address form needs a state/province field. */
export const NEED_OR_HAS_REGION: readonly CountryCode[] = [
  "US", // United States (Has regions)
  "GB", // United Kingdom (Has regions/countries/council areas in the package)
  "CN", // China (Has regions)
  "KR", // South Korea (Has regions)
  "JP", // Japan (Has regions)
  "MY", // Malaysia (Has regions)
  "TH", // Thailand (Has regions)
  "AU", // Australia (Has regions)
  "VN", // Vietnam (Has regions)
  "CO", // Colombia (Has regions)
  "PH", // Philippines (Has regions)
]

/** Full display names, for sentences and selects. */
export const COUNTRY_LABELS: Readonly<Partial<Record<CountryCode, string>>> = {
  AU: "Australia",
  CN: "China",
  CO: "Colombia",
  GB: "United Kingdom",
  JP: "Japan",
  KR: "South Korea",
  MY: "Malaysia",
  PH: "Philippines",
  SG: "Singapore",
  TH: "Thailand",
  US: "United States",
  VN: "Vietnam",
}

/** Short forms for tight labels (footer, badges). Falls back to the full name. */
export const COUNTRY_SHORT: Readonly<Partial<Record<CountryCode, string>>> = {
  AU: "Australia",
  CN: "China",
  CO: "Colombia",
  GB: "UK",
  JP: "Japan",
  KR: "Korea",
  MY: "Malaysia",
  PH: "Philippines",
  SG: "Singapore",
  TH: "Thailand",
  US: "USA",
  VN: "Vietnam",
}

/** "United States, United Kingdom, New Zealand, Australia" — for sentences. */
export const DELIVERY_COUNTRIES_PROSE = DELIVERY_COUNTRIES.map(
  // eslint-disable-next-line security/detect-object-injection -- `code` is a validated CountryCode, not user input.
  (code) => COUNTRY_LABELS[code] ?? code
).join(", ")

/** "USA · UK · NZ · Australia" — for compact labels like the footer. */
export const DELIVERY_COUNTRIES_COMPACT = DELIVERY_COUNTRIES.map(
  // eslint-disable-next-line security/detect-object-injection -- `code` is a validated CountryCode, not user input.
  (code) => COUNTRY_SHORT[code] ?? COUNTRY_LABELS[code] ?? code
).join(" · ")

/* ── how we get paid ─────────────────────────────────────────────────────── */

export const PAYMENT_METHODS = [
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "usdt-erc20", label: "USDT (ERC-20)" },
  { id: "usdt-trc20", label: "USDT (TRC-20)" },
  { id: "usdt-sol", label: "USDT (SOL)" },
  { id: "usdc-erc20", label: "USDC (ERC-20)" },
  { id: "usdc-sol", label: "USDC (SOL)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "sol", label: "Solana (SOL)" },
] as const

/* ── the config object ────────────────────────────────────────────────────── */

export const siteConfig = {
  /* — identity: env-driven, shown everywhere — */
  name:
    noHtml(process.env.NEXT_PUBLIC_SITE_NAME, "NEXT_PUBLIC_SITE_NAME") ||
    DEFAULTS.name,
  url: publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, DEFAULTS.url),
  founded: publicYear(process.env.NEXT_PUBLIC_FOUNDED_YEAR, 2020),

  /* — SEO / social: copy, but structural enough to live with identity — */
  tagline: "Your Trusted Partner in Pharmaceutical Care.",
  description:
    "Explore generic medicines and ethical pharmaceutical brands from India. Browse our catalog or contact us for ordering assistance.",

  copyrightYear: new Date().getFullYear(),

  /* — navigation: structural, not copy — */
  navigation: [
    { id: "home", label: "Home", mobileLabel: "Home", footerLabel: "Home" },
    {
      id: "catalog",
      label: "Catalog",
      mobileLabel: "Catalog",
      footerLabel: "Pharmaceutical Catalog",
    },
    {
      id: "about",
      label: "About Us",
      mobileLabel: "About",
      footerLabel: "About Us",
    },
    {
      id: "faq",
      label: "FAQs",
      mobileLabel: "FAQs",
      footerLabel: "FAQs & Shipping Information",
    },
    {
      id: "contact",
      label: "Contact Us",
      mobileLabel: "Contact",
      footerLabel: "Contact Us",
    },
  ],

  /* — how to reach us: env-driven — */
  contact: {
    email: contactEmail,
    telegramUsername,
    supportHours:
      noHtml(
        process.env.NEXT_PUBLIC_SUPPORT_HOURS,
        "NEXT_PUBLIC_SUPPORT_HOURS"
      ) || "Monday – Saturday",
  },

  /* — shipping + payment: structural — */
  shipping: {
    countries: DELIVERY_COUNTRIES,
    countriesProse: DELIVERY_COUNTRIES_PROSE,
    countriesCompact: DELIVERY_COUNTRIES_COMPACT,
    regionRequired: NEED_OR_HAS_REGION,
  },
  payments: PAYMENT_METHODS,

  /* — build plumbing — */
  catalog: {
    dataUrl: publicValue(process.env.NEXT_PUBLIC_CATALOG_DATA_URL),
    /**
     * Repeating-XOR key used to mask the catalog artifact.
     */
    xorKey: publicValue(
      process.env.NEXT_PUBLIC_CATALOG_XOR_KEY,
      "tipind-catalog-v6"
    ),
  },
} satisfies SiteConfig
