import {
  postcodeValidator,
  postcodeValidatorExistsForCountry,
} from "postcode-validator"
import type { SERVICED_COUNTRY } from "../types"

/** False for countries without a known postal-code format (then it's optional). */
export function hasPostalSystem(country: SERVICED_COUNTRY) {
  try {
    return postcodeValidatorExistsForCountry(country)
  } catch {
    return false
  }
}

export function isValidPostal(value: string, country: SERVICED_COUNTRY) {
  try {
    return postcodeValidator(value, country)
  } catch {
    return false
  }
}
