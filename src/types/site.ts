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
    email: string
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
