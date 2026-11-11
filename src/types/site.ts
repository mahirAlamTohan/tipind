import type { CountryCode } from "libphonenumber-js"

export interface NavigationItem {
  /** Section id, e.g. "catalog". Links are `/#<id>`. */
  id: string
  label: string
  mobileLabel: string
  footerLabel: string
}

export interface PaymentMethod {
  /** Stored in localStorage and the order message. Never change this. */
  id: string
  /** Shown to the visitor. Safe to change. */
  label: string
}

/**
 * Everything the business *is*: facts, contact channels, business rules and
 * build plumbing. Owned by `src/config/site.ts`.
 *
 * The words on the page are not here — they live in `src/config/content.ts`
 * and `src/features/<area>/content.ts`.
 */
export interface SiteConfig {
  /* identity */
  name: string
  url: string
  tagline: string
  description: string
  founded: number
  copyrightYear: number

  /* structure */
  navigation: readonly NavigationItem[]

  /* how to reach us */
  contact: {
    /** As typed by the client, e.g. "+91 8766267499". May be empty. */
    phone: string
    /** Digits only, for wa.me links. May be empty. */
    whatsappNumber: string
    email: string
    /** Without the leading "@". May be empty. */
    telegramUsername: string
    supportHours: string
  }

  /* business rules */
  shipping: {
    /** ISO codes. The single source of truth for where we ship. */
    countries: readonly CountryCode[]
    /** "United States, United Kingdom, …" for use in sentences. */
    countriesProse: string
    /** "US · UK · NZ · AU" for compact labels. */
    countriesCompact: string
    /** Countries whose address form needs a state/province. */
    regionRequired: readonly CountryCode[]
  }
  payments: readonly PaymentMethod[]

  /* build plumbing */
  catalog: {
    dataUrl: string
    /** Public XOR mask for the artifact. Not a secret — see config/site.ts. */
    xorKey: string
  }
}
