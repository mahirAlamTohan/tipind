import { allCountries } from "country-region-data"

import { SERVICED_COUNTRIES } from "../constants"
import type { SERVICED_COUNTRY } from "../types"

export interface Region {
  readonly code: string
  readonly name: string
}

export interface Country {
  readonly code: SERVICED_COUNTRY
  readonly name: string
  readonly regions: readonly Region[]
}

export const COUNTRIES: readonly Country[] = allCountries
  .filter(([, code]) =>
    (SERVICED_COUNTRIES as readonly string[]).includes(code)
  )
  .map(([name, code, regions]) => ({
    code: code as SERVICED_COUNTRY,
    name,
    regions: regions.map(([regionName, regionCode]) => ({
      code: regionCode,
      name: regionName,
    })),
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]))

export const findCountry = (code: SERVICED_COUNTRY) => BY_CODE.get(code)
export const isCountryCode = (code: SERVICED_COUNTRY) => BY_CODE.has(code)

const REGION_LABELS = new Map<SERVICED_COUNTRY, string>([
  ["AU", "State / territory"],
  ["GB", "County / region"],
  ["NZ", "Region"],
  ["US", "State"],
])

const POSTAL_LABELS = new Map<SERVICED_COUNTRY, string>([
  ["AU", "Postcode"],
  ["GB", "Postcode"],
  ["NZ", "Postcode"],
  ["US", "ZIP code"],
])

export const regionLabel = (code: SERVICED_COUNTRY) =>
  REGION_LABELS.get(code) ?? "State / region"
export const postalLabel = (code: SERVICED_COUNTRY) =>
  POSTAL_LABELS.get(code) ?? "Postal code"
