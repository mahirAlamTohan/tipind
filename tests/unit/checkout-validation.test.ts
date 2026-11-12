/**
 * Unit tests for checkout details validation.
 *
 * Run:  bun test tests/unit/checkout-validation.test.ts
 */

// eslint-disable-next-line import-x/no-unresolved -- bun:test is a Bun runtime module
import { describe, expect, test } from "bun:test"
import { validateDetails } from "@/features/checkout/lib/validation"
import type { ShippingDetails } from "@/features/checkout/types"

function details(overrides: Partial<ShippingDetails> = {}): ShippingDetails {
  return {
    firstName: "John",
    lastName: "Doe",
    email: "john@example.com",
    company: "",
    country: "US",
    addressLine1: "123 Main St",
    addressLine2: "",
    city: "Springfield",
    region: "Illinois",
    postalCode: "62701",
    paymentMethod: "",
    notes: "",
    ...overrides,
  }
}

describe("valid details pass validation", () => {
  test("complete US address with all required fields", () => {
    const errors = validateDetails(details())
    expect(errors.size).toBe(0)
  })

  test("optional fields can be empty", () => {
    const d = details({ company: "", addressLine2: "", paymentMethod: "", notes: "" })
    const errors = validateDetails(d)
    expect(errors.size).toBe(0)
  })
})

describe("required field validation", () => {
  test("empty first name fails", () => {
    const errors = validateDetails(details({ firstName: "" }))
    expect(errors.has("firstName")).toBe(true)
  })

  test("whitespace-only first name fails", () => {
    const errors = validateDetails(details({ firstName: "   " }))
    expect(errors.has("firstName")).toBe(true)
  })

  test("empty last name fails", () => {
    const errors = validateDetails(details({ lastName: "" }))
    expect(errors.has("lastName")).toBe(true)
  })

  test("empty email fails", () => {
    const errors = validateDetails(details({ email: "" }))
    expect(errors.has("email")).toBe(true)
  })

  test("invalid email fails", () => {
    const errors = validateDetails(details({ email: "not-an-email" }))
    expect(errors.has("email")).toBe(true)
  })

  test("empty country fails", () => {
    const errors = validateDetails(details({ country: "" as unknown as ShippingDetails["country"] }))
    expect(errors.has("country")).toBe(true)
  })

  test("empty address line 1 fails", () => {
    const errors = validateDetails(details({ addressLine1: "" }))
    expect(errors.has("addressLine1")).toBe(true)
  })

  test("empty city fails", () => {
    const errors = validateDetails(details({ city: "" }))
    expect(errors.has("city")).toBe(true)
  })

  test("empty postal code fails for countries with postal system", () => {
    const errors = validateDetails(details({ postalCode: "", country: "US" }))
    expect(errors.has("postalCode")).toBe(true)
  })
})

describe("field length caps", () => {
  test("first name exactly 200 chars passes", () => {
    const errors = validateDetails(details({ firstName: "A".repeat(200) }))
    expect(errors.has("firstName")).toBe(false)
  })

  test("notes exactly 240 chars passes", () => {
    const errors = validateDetails(details({ notes: "A".repeat(240) }))
    expect(errors.has("notes")).toBe(false)
  })
})

describe("returns Map of field name to error kind", () => {
  test("returns Map with string keys", () => {
    const errors = validateDetails(details({ firstName: "" }))
    expect(errors).toBeInstanceOf(Map)
    for (const [field, kind] of errors) {
      expect(typeof field).toBe("string")
      expect(typeof kind).toBe("string")
    }
  })
})
