import { z } from "zod"

import {
  MAX_FIELD_LENGTH,
  MAX_NOTES_LENGTH,
  PAYMENT_METHODS,
} from "../constants"
import type {
  FieldName,
  PaymentMethod,
  SERVICED_COUNTRY,
  ShippingDetails,
} from "../types"
import { stripControlChars } from "@/lib/sanitize"
import { isCountryCode } from "./countries"

export const EMPTY_DETAILS: ShippingDetails = {
  addressLine1: "",
  addressLine2: "",
  city: "",
  company: "",
  country: "US",
  email: "",
  firstName: "",
  lastName: "",
  notes: "",
  paymentMethod: "",
  postalCode: "",
  region: "",
}

export const findPayment = (id: string): PaymentMethod | undefined =>
  PAYMENT_METHODS.find((method) => method.id === id)

export function fieldValue(details: ShippingDetails, field: FieldName) {
  // eslint-disable-next-line security/detect-object-injection -- `field` is a keyof ShippingDetails, never user input.
  return details[field]
}

/** Lenient: a bad stored field becomes "", it never throws. */
const short = z
  .string()
  .max(MAX_FIELD_LENGTH)
  .transform((v) => stripControlChars(v))
  .catch("")

const storedSchema = z.object({
  addressLine1: short,
  addressLine2: short,
  city: short,
  company: short,
  country: z
    .string()
    .trim()
    .refine(
      (val): val is SERVICED_COUNTRY => isCountryCode(val as SERVICED_COUNTRY),
      { message: "required" }
    ),
  email: short,
  firstName: short,
  lastName: short,
  notes: z
    .string()
    .max(MAX_NOTES_LENGTH)
    .transform((v) => stripControlChars(v, true))
    .catch(""),
  paymentMethod: z
    .string()
    .catch("")
    .transform((value) => findPayment(value)?.id ?? ""),
  postalCode: short,
  region: short,
})

/** Rebuilds a safe ShippingDetails from untrusted (stored) data. */
export function sanitizeDetails(raw: unknown): ShippingDetails {
  const parsed = storedSchema.safeParse(raw)
  return parsed.success ? parsed.data : EMPTY_DETAILS
}

export function trimDetails(details: ShippingDetails): ShippingDetails {
  return {
    ...details,
    addressLine1: details.addressLine1.trim(),
    addressLine2: details.addressLine2.trim(),
    city: details.city.trim(),
    company: details.company.trim(),
    email: details.email.trim(),
    firstName: details.firstName.trim(),
    lastName: details.lastName.trim(),
    notes: details.notes.trim(),
    postalCode: details.postalCode.trim(),
    region: details.region.trim(),
  }
}
