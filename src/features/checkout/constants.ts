/**
 * Checkout tunables that are *implementation* concerns: storage keys, length
 * limits, the form id.
 *
 * Business configuration is NOT here. Where we ship and how we get paid are
 * facts about the business, so they live in `src/config/site.ts` and are merely
 * re-exported below for the checkout's convenience. Before this, the payment
 * list and the country list were duplicated in this file and in `site.ts`.
 */
import { siteConfig } from "@/config/site"

import type { SERVICED_COUNTRY } from "./types"

export const STORAGE_KEY = "tipind:checkout:v1"
export const STORAGE_VERSION = 1
export const FORM_ID = "checkout-details-form"
export const MAX_FIELD_LENGTH = 200
export const MAX_NOTES_LENGTH = 240

/** Cargo fee by ISO country code, in mills (15_000 = $15.000). Missing = "To be confirmed". */
export const SHIPPING_MILLS: ReadonlyMap<string, number> = new Map<
  string,
  number
>([
  // ["US", 15_000],
])

/** Countries you actively ship to. Others can order, but see a notice. */
export const SERVICED_COUNTRIES = siteConfig.shipping.countries

/** Countries where an address needs a state or province. */
export const REGION_REQUIRED = new Set<SERVICED_COUNTRY>(
  siteConfig.shipping.regionRequired.filter((code) =>
    SERVICED_COUNTRIES.includes(code)
  )
)

/** How the visitor can pay. Defined once, in site.ts. */
export const PAYMENT_METHODS = siteConfig.payments
