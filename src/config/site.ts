/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  SITE CONFIGURATION — the only file that defines what this business *is*.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Read this file first. If you are looking for a value and cannot find it here,
 * see `src/config/content.ts` (visible copy) or `src/features/<area>/content.ts`
 * (copy for one feature). The rule is:
 *
 *   site.ts     facts and switches: name, contact, places we ship, how we get
 *               paid, sizes, keys. Values a developer or `.env` sets.
 *   content.ts  the words on the page. Values a copywriter or the client sets.
 *
 * Both are build-time only. There are no runtime environment variables: the
 * site is a static export, so anything here is compiled into the HTML/JS.
 *
 * Precedence, lowest to highest:
 *
 *   default in this file  →  .env.production  →  the build environment
 *
 * Everything under "env-driven" is overridable without touching code, which is
 * what `.env.production` is for. Everything under "structural" is a business
 * decision that belongs in review, not in a deploy button.
 */

import type { CountryCode } from "libphonenumber-js"

import type { SiteConfig } from "@/types/site"

/* ── env helpers ──────────────────────────────────────────────────────────── */

/**
 * A public env value, or the fallback when unset/blank.
 *
 * Blank counts as unset on purpose: `NEXT_PUBLIC_CONTACT_PHONE=` in an env file
 * should mean "not configured", not "the empty string". So an empty result must
 * fall through to the fallback, which is why this is not `??`.
 */
function publicValue(value: string | undefined, fallback = "") {
  const trimmed = value?.trim()
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- empty string must fall through; `??` would keep "".
  return trimmed ? trimmed : fallback
}

/** An env value that must be HTTPS; throws at build time if it is not. */
function publicSiteUrl(value: string | undefined, fallback: string) {
  const url = new URL(publicValue(value, fallback))
  if (url.protocol !== "https:") {
    throw new Error("NEXT_PUBLIC_SITE_URL must use HTTPS.")
  }
  return url.origin
}

/** `2012` / `"2012"` → 2012. Rejects anything that is not a plausible year. */
function publicYear(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(publicValue(value), 10)
  if (!Number.isFinite(parsed)) return fallback
  if (parsed < 1800 || parsed > 2200) {
    throw new Error(`NEXT_PUBLIC_FOUNDED_YEAR must be a four-digit year, got "${String(value)}".`)
  }
  return parsed
}

/** Comma-separated ISO country codes → validated list. */
function publicCountryCodes(value: string | undefined, fallback: readonly CountryCode[]) {
  const raw = publicValue(value)
  if (!raw) return fallback
  return raw
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean) as CountryCode[]
}

/* ── raw env ──────────────────────────────────────────────────────────────── */

const DEFAULTS = {
  name: "tipind",
  url: "https://tipind.mahiralamtohan.workers.dev",
} as const

const contactPhone = publicValue(process.env.NEXT_PUBLIC_CONTACT_PHONE)
const whatsappNumber = publicValue(
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER
).replace(/\D/g, "")
const contactEmail = publicValue(process.env.NEXT_PUBLIC_CONTACT_EMAIL)
const telegramUsername = publicValue(
  process.env.NEXT_PUBLIC_TELEGRAM_USERNAME
).replace(/^@/, "")

/* ── where we ship ─────────────────────────────────────────────────────────
 * ONE list. The checkout dropdown, the FAQ answer, the checkout notice, the
 * about section and the footer all read from this. Before this was centralised
 * the list existed in five places and had already drifted: the dropdown offered
 * India while every piece of prose said four countries.
 */

/** Countries you actively ship to, in display order. */
export const DELIVERY_COUNTRIES: readonly CountryCode[] = publicCountryCodes(
  process.env.NEXT_PUBLIC_DELIVERY_COUNTRIES,
  ["US", "GB", "NZ", "AU"]
)

/** Countries whose address form needs a state/province field. */
export const NEED_OR_HAS_REGION: readonly CountryCode[] = ["US", "AU", "IN"]

/** Full display names, for sentences and selects. */
export const COUNTRY_LABELS: Readonly<Partial<Record<CountryCode, string>>> = {
  AU: "Australia",
  CA: "Canada",
  GB: "United Kingdom",
  IN: "India",
  NZ: "New Zealand",
  US: "United States",
}

/** Short forms for tight labels (footer, badges). Falls back to the full name. */
export const COUNTRY_SHORT: Readonly<Partial<Record<CountryCode, string>>> = {
  AU: "Australia",
  CA: "Canada",
  GB: "UK",
  IN: "India",
  NZ: "NZ",
  US: "USA",
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

/* ── how we get paid ───────────────────────────────────────────────────────
 * Client-facing business config, so it lives here rather than in the checkout
 * feature's constants. `id` is stored in localStorage and in the order message;
 * never change an id, only its label.
 */

export const PAYMENT_METHODS = [
  { id: "btc", label: "Bitcoin (BTC)" },
  { id: "usdt-trc20", label: "USDT (TRC-20)" },
  { id: "usdt-erc20", label: "USDT (ERC-20)" },
  { id: "eth", label: "Ethereum (ETH)" },
  { id: "usdc-erc20", label: "USDC (ERC-20)" },
] as const

/* ── the config object ────────────────────────────────────────────────────── */

export const siteConfig = {
  /* — identity: env-driven, shown everywhere — */
  name: publicValue(process.env.NEXT_PUBLIC_SITE_NAME, DEFAULTS.name),
  url: publicSiteUrl(process.env.NEXT_PUBLIC_SITE_URL, DEFAULTS.url),
  founded: publicYear(process.env.NEXT_PUBLIC_FOUNDED_YEAR, 2012),

  /* — SEO / social: copy, but structural enough to live with identity — */
  tagline: "Pharmaceutical healthcare you can trust",
  description:
    "Supplies generic medicines and ethical brand medications from India. Browse the pharmaceutical catalog or contact our team for ordering assistance.",

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
    { id: "about", label: "About Us", mobileLabel: "About", footerLabel: "About Us" },
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
    phone: contactPhone,
    whatsappNumber,
    email: contactEmail,
    telegramUsername,
    supportHours: publicValue(
      process.env.NEXT_PUBLIC_SUPPORT_HOURS,
      "Monday – Saturday · 9:00 AM – 8:00 PM IST"
    ),
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
     *
     * This is *not* a secret and must not be treated as one: it is inlined
     * into the public JS bundle by definition. Its job is to make the artifact
     * useless to anyone who does not run the site's code.
     */
    xorKey: publicValue(
      process.env.NEXT_PUBLIC_CATALOG_XOR_KEY,
      "tipind-catalog-mask-v6"
    ),
  },
} satisfies SiteConfig
