/**
 * Unit tests for cart line-item logic.
 *
 * Run:  bun test tests/unit/cart.test.ts
 */

import { describe, expect, test } from "bun:test"
import {
  createLineItem,
  clampQuantity,
  lineTotalMills,
  totalMills,
  packetCount,
} from "@/features/cart/lib/line-items"
import type { CatalogProduct } from "@/features/catalog/types"

function product(
  id: number,
  overrides: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id,
    name: `Product ${id}`,
    ingredient: "ING",
    manufacturer: "MFR",
    packaging: "PACK",
    type: "tablet",
    priceMills: 1000,
    ...overrides,
  }
}

describe("createLineItem", () => {
  test("creates a line item from a valid product", () => {
    const p = product(1, { name: "PARACETAMOL", priceMills: 500 })
    const item = createLineItem(p)
    expect(item).not.toBeNull()
    expect(item?.id).toContain("PARACETAMOL")
    expect(item?.quantity).toBe(1)
    expect(item?.unitPriceMills).toBe(500)
  })

  test("rejects products with null price", () => {
    const p = product(1, { priceMills: null })
    expect(createLineItem(p)).toBeNull()
  })

  test("rejects products with zero price", () => {
    const p = product(1, { priceMills: 0 })
    expect(createLineItem(p)).toBeNull()
  })

  test("rejects products with negative price", () => {
    const p = product(1, { priceMills: -100 })
    expect(createLineItem(p)).toBeNull()
  })
})

describe("clampQuantity", () => {
  test("clamps to 1 when below minimum", () => {
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(-5)).toBe(1)
  })

  test("clamps to MAX_QUANTITY when above maximum", () => {
    expect(clampQuantity(999)).toBe(50)
  })

  test("returns the value when within range", () => {
    expect(clampQuantity(3)).toBe(3)
  })

  test("handles non-finite values", () => {
    expect(clampQuantity(NaN)).toBe(1)
    expect(clampQuantity(Infinity)).toBe(50)
  })
})

describe("lineTotalMills", () => {
  test("calculates unit price times quantity", () => {
    const item = { id: "a", unitPriceMills: 500, quantity: 3 }
    expect(lineTotalMills(item)).toBe(1500)
  })
})

describe("totalMills", () => {
  test("sums all line totals", () => {
    const items = [
      { id: "a", unitPriceMills: 1000, quantity: 2 },
      { id: "b", unitPriceMills: 500, quantity: 4 },
    ]
    expect(totalMills(items)).toBe(4000)
  })

  test("returns 0 for empty cart", () => {
    expect(totalMills([])).toBe(0)
  })
})

describe("packetCount", () => {
  test("sums all quantities", () => {
    const items = [
      { id: "a", unitPriceMills: 1000, quantity: 2 },
      { id: "b", unitPriceMills: 500, quantity: 3 },
    ]
    expect(packetCount(items)).toBe(5)
  })

  test("returns 0 for empty cart", () => {
    expect(packetCount([])).toBe(0)
  })
})
