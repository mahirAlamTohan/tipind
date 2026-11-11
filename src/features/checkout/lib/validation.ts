import { z } from "zod"

import { formatMessage } from "@/lib/format"
import { stripControlChars } from "@/lib/sanitize"

import { MAX_FIELD_LENGTH, MAX_NOTES_LENGTH, REGION_REQUIRED } from "../constants"
import { checkoutContent } from "../content"
import type {
  ErrorKind,
  FieldName,
  SERVICED_COUNTRY,
  ShippingDetails,
} from "../types"
import { hasPostalSystem, isValidPostal } from "./address"
import { findCountry, isCountryCode } from "./countries"
import { EMPTY_DETAILS } from "./details"

const clean = (max: number, allowNewlines = false) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => stripControlChars(v, allowNewlines))

/** Zod messages are error kinds; the visible text comes from content.ts. */
const required = () => clean(MAX_FIELD_LENGTH).pipe(z.string().min(1, "required"))

function buildSchema(code: SERVICED_COUNTRY) {
  const country = findCountry(code)
  const regions = new Set(country?.regions.map((region) => region.name))
  const postalNeeded = country ? hasPostalSystem(code) : false

  return z.object({
    addressLine1: required(),
    addressLine2: clean(MAX_FIELD_LENGTH),
    city: required(),
    company: clean(MAX_FIELD_LENGTH),
    country: z
      .string()
      .trim()
      .refine(
        (val): val is SERVICED_COUNTRY =>
          isCountryCode(val as SERVICED_COUNTRY),
        { message: "required" }
      ),
    email: required().pipe(z.email("email")),
    firstName: required(),
    lastName: required(),
    notes: clean(MAX_NOTES_LENGTH, true),
    paymentMethod: z.string(),
    postalCode: (postalNeeded ? required() : clean(MAX_FIELD_LENGTH)).refine(
      (value) => value === "" || !postalNeeded || isValidPostal(value, code),
      "postal"
    ),
    region: (REGION_REQUIRED.has(code) ? required() : clean(MAX_FIELD_LENGTH)).refine(
      (value) => value === "" || regions.size === 0 || regions.has(value),
      "region"
    ),
  })
}

const schemas = new Map<string, ReturnType<typeof buildSchema>>()

function schemaFor(code: SERVICED_COUNTRY) {
  let schema = schemas.get(code)
  if (!schema) {
    schema = buildSchema(code)
    schemas.set(code, schema)
  }
  return schema
}

const KINDS: ReadonlySet<string> = new Set<ErrorKind>([
  "required",
  "email",
  "postal",
  "region",
])
const isErrorKind = (value: string): value is ErrorKind => KINDS.has(value)
const isFieldName = (value: string): value is FieldName =>
  Object.hasOwn(EMPTY_DETAILS, value)

/** First problem per field, in the order the checks run. */
export function validateDetails(
  details: ShippingDetails
): ReadonlyMap<FieldName, ErrorKind> {
  const errors = new Map<FieldName, ErrorKind>()
  const result = schemaFor(details.country).safeParse(details)
  if (result.success) return errors

  for (const issue of result.error.issues) {
    const field = issue.path.at(0)
    if (
      typeof field === "string" &&
      isFieldName(field) &&
      isErrorKind(issue.message) &&
      !errors.has(field)
    ) {
      errors.set(field, issue.message)
    }
  }
  return errors
}

export function errorText(kind: ErrorKind, details: ShippingDetails) {
  const errors = checkoutContent.errors
  const country = findCountry(details.country)?.name ?? ""

  switch (kind) {
    case "required":
      return errors.required
    case "email":
      return errors.email
    case "region":
      return errors.region
    case "postal":
      return formatMessage(errors.postal, { country })
  }
}
