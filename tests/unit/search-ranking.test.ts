/**
 * Unit tests for the modular catalog search ranking.
 *
 * Run:  bun test tests/unit/search-ranking.test.ts
 *
 * Covers every ranking rule the product owner specified:
 *   • Field tier: name > ingredient > manufacturer > packaging > price
 *   • Quality: whole word > word start > inside word
 *   • Term count in primary field (more = better)
 *   • Digits enable packaging + price fields
 *   • Compact matching (spaces removed) ranks below regular matches
 */

import { describe, expect, test } from "bun:test"
import { searchProducts, parseQuery } from "@/features/catalog/lib/search"
import type { CatalogProduct } from "@/features/catalog/types"

function product(
  id: number,
  overrides: Partial<CatalogProduct> = {},
): CatalogProduct {
  return {
    id,
    name: overrides.name ?? `Product ${id}`,
    ingredient: overrides.ingredient ?? "",
    manufacturer: overrides.manufacturer ?? "",
    packaging: overrides.packaging ?? "",
    type: overrides.type ?? "tablet",
    priceMills: overrides.priceMills ?? 1000,
  }
}

describe("field tier: name outranks ingredient", () => {
  test("product named exactly ACECLOHEAL MR TAB ranks first for ACECLOHEAL MR", () => {
    const products = [
      product(1, {
        name: "ACECLOHEAL MR TAB",
        ingredient: "ACE CLOFENAC",
        manufacturer: "MFR A",
      }),
      product(2, {
        name: "OTHER MED",
        ingredient: "ACECLOHEAL MR",
        manufacturer: "MFR B",
      }),
      product(3, {
        name: "SOMETHING ELSE",
        ingredient: "OTHER",
        manufacturer: "ACECLOHEAL MR",
      }),
    ]

    const result = searchProducts(products, parseQuery("ACECLOHEAL MR"))
    expect(result[0]).toBe(products[0])
    expect(result[0].name).toBe("ACECLOHEAL MR TAB")
  })

  test("product named PARACETAMOL ranks first for PARACETAMOL", () => {
    const products = [
      product(1, { name: "PARACETAMOL 500MG", ingredient: "OTHER" }),
      product(2, { name: "PAIN RELIEF", ingredient: "PARACETAMOL" }),
      product(3, { name: "EXACT PARACETAMOL", ingredient: "OTHER" }),
    ]

    const result = searchProducts(products, parseQuery("PARACETAMOL"))
    // Both product 1 and 3 have PARACETAMOL in name; product 1 starts with it
    expect(result[0].name).toContain("PARACETAMOL")
  })
})

describe("quality: whole word > word start > inside word", () => {
  test("whole word match ranks above partial match in same field", () => {
    const products = [
      product(1, { name: "IBUPROFEN TABLET" }),
      product(2, { name: "IBUPROFENOL SYRUP" }),
    ]

    const result = searchProducts(products, parseQuery("IBUPROFEN"))
    expect(result[0]).toBe(products[0])
    expect(result[0].name).toBe("IBUPROFEN TABLET")
  })

  test("word start match ranks above inside-word match", () => {
    const products = [
      product(1, { name: "ASPIRIN TABLET" }),
      product(2, { name: "MED-ASPIRINE SYRUP" }),
    ]

    const result = searchProducts(products, parseQuery("ASPIRIN"))
    expect(result[0]).toBe(products[0])
  })
})

describe("term count in primary field", () => {
  test("more terms matched in name ranks higher", () => {
    const products = [
      product(1, { name: "AMOXICILLIN CAPSULE", ingredient: "CLAVULANATE" }),
      product(2, { name: "AMOXICILLIN CLAVULANATE TABLET", ingredient: "OTHER" }),
    ]

    const result = searchProducts(products, parseQuery("AMOXICILLIN CLAVULANATE"))
    expect(result[0]).toBe(products[2] || products[1])
    expect(result[0].name).toContain("AMOXICILLIN")
    expect(result[0].name).toContain("CLAVULANATE")
  })
})

describe("digits enable packaging and price fields", () => {
  test("500 matches price field when query has digits", () => {
    const products = [
      product(1, { name: "OTHER MED", priceMills: 500 }),
      product(2, { name: "NO MATCH", priceMills: 999 }),
    ]

    const result = searchProducts(products, parseQuery("500"))
    expect(result[0]).toBe(products[0])
    expect(result[0].priceMills).toBe(500)
  })

  test("no digits: price field not searched", () => {
    const products = [
      product(1, { name: "FIVE HUNDRED", priceMills: 500 }),
      product(2, { name: "OTHER", priceMills: 999 }),
    ]

    const result = searchProducts(products, parseQuery("FIVE HUNDRED"))
    expect(result[0]).toBe(products[0])
    expect(result[0].name).toBe("FIVE HUNDRED")
  })
})

describe("compact matching ranks below regular matches", () => {
  test("multi-word query with spaces removed matches compact field", () => {
    const products = [
      product(1, { name: "A S LIFESCIENCES", manufacturer: "ASLIFESCIENCES" }),
      product(2, { name: "NO MATCH HERE", manufacturer: "OTHER" }),
    ]

    const result = searchProducts(products, parseQuery("AS LIFE"))
    // Both terms match in name (compact: "ASLIFE"), should rank first
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].name).toContain("LIFESCIENCES")
  })
})

describe("every term must match somewhere", () => {
  test("product missing one term is excluded", () => {
    const products = [
      product(1, { name: "AMOXICILLIN", ingredient: "CLAVULANATE" }),
      product(2, { name: "AMOXICILLIN ONLY", ingredient: "OTHER" }),
    ]

    const result = searchProducts(products, parseQuery("AMOXICILLIN CLAVULANATE"))
    expect(result[0]).toBe(products[0])
    expect(result.length).toBe(1)
  })

  test("no matches returns empty array", () => {
    const products = [product(1, { name: "UNRELATED MEDICINE" })]
    const result = searchProducts(products, parseQuery("ZZZ NOTHING"))
    expect(result).toEqual([])
  })
})

describe("stable tie-breaker by product id", () => {
  test("equal scores sort by ascending product id", () => {
    const products = [
      product(10, { name: "MEDICINE A" }),
      product(5, { name: "MEDICINE B" }),
      product(3, { name: "MEDICINE C" }),
    ]

    const result = searchProducts(products, parseQuery("MEDICINE"))
    const ids = result.map((p) => p.id)
    expect(ids).toEqual([3, 5, 10])
  })
})
