/**
 * Unit tests for cart line-item logic.
 *
 * Run:  bun test tests/unit/cart.test.ts
 */

// eslint-disable-next-line import-x/no-unresolved -- bun:test is a Bun runtime module
import { describe, expect, test } from "bun:test"
import {
  createLineItem,
  clampQuantity,
  lineTotalMills,
  totalMills,
  packetCount,
} from "@/features/cart/lib/line-items"
import type { CatalogProduct } from "@/features/catalog/types"
import type { CartLineItem } from "@/features/cart/types"

function product(
  id: number,
  overrides: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id,
    name: `Product ${String(id)}`,
    ingredient: "ING",
    manufacturer: "MFR",
    packaging: "PACK",
    type: "tablet",
    priceMills: 1000,
    ...overrides,
  }
}

function lineItem(overrides: Partial<CartLineItem> = {}): CartLineItem {
  return {
    id: "item-1",
    name: "Test Item",
    ingredient: "ING",
    manufacturer: "MFR",
    packaging: "PACK",
    type: "tablet",
    unitPriceMills: 1000,
    quantity: 1,
    ...overrides,
  }
}

describe("createLineItem", () => {
  test("creates a line item from a valid product", () => {
    const p = product(1, { name: "PARACETAMOL", priceMills: 500 })
    const item = createLineItem(p)
    expect(item).not.toBe(null)
    expect(item?.id).toContain("paracetamol")
    expect(item?.quantity).toBe(1)
    expect(item?.unitPriceMills).toBe(500)
  })

  test("rejects products with null price", () => {
    const p = product(1, { priceMills: null })
    expect(createLineItem(p)).toBe(null)
  })

  test("rejects products with zero price", () => {
    const p = product(1, { priceMills: 0 })
    expect(createLineItem(p)).toBe(null)
  })

  test("rejects products with negative price", () => {
    const p = product(1, { priceMills: -100 })
    expect(createLineItem(p)).toBe(null)
  })
})

describe("clampQuantity", () => {
  test("clamps to 1 when below minimum", () => {
    expect(clampQuantity(0)).toBe(1)
    expect(clampQuantity(-5)).toBe(1)
  })

  test("clamps to MAX_QUANTITY (9999) when above maximum", () => {
    expect(clampQuantity(99999)).toBe(9999)
  })

  test("returns the value when within range", () => {
    expect(clampQuantity(3)).toBe(3)
  })

  test("handles non-finite values", () => {
    expect(clampQuantity(NaN)).toBe(1)
    expect(clampQuantity(Infinity)).toBe(1)
  })
})

describe("lineTotalMills", () => {
  test("calculates unit price times quantity", () => {
    const item = lineItem({ unitPriceMills: 500, quantity: 3 })
    expect(lineTotalMills(item)).toBe(1500)
  })
})

describe("totalMills", () => {
  test("sums all line totals", () => {
    const items = [
      lineItem({ unitPriceMills: 1000, quantity: 2 }),
      lineItem({ unitPriceMills: 500, quantity: 4 }),
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
      lineItem({ quantity: 2 }),
      lineItem({ quantity: 3 }),
    ]
    expect(packetCount(items)).toBe(5)
  })

  test("returns 0 for empty cart", () => {
    expect(packetCount([])).toBe(0)
  })
})
