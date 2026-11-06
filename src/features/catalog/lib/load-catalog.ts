import { isRecord } from "@/lib/guards"

import { CATALOG_FORMAT, NO_VALUE } from "../constants"
import type { CatalogDataset, CatalogProduct, PriceRange } from "../types"

const corrupt = (detail: string) =>
  new Error(
    `The catalog file is corrupted or from an older build (${detail}). Rebuild and redeploy it with \`npm run catalog:build\`.`
  )

function readStrings(value: unknown, label: string): string[] {
  if (!Array.isArray(value)) throw corrupt(label)
  const items: unknown[] = value
  return items.map((item) => {
    if (typeof item !== "string") throw corrupt(label)
    return item
  })
}

function readBounds(value: unknown): PriceRange {
  if (!Array.isArray(value)) throw corrupt("price bounds")
  const [min, max]: number[] = value as number[]
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min < 0 ||
    max <= min
  ) {
    throw corrupt("price bounds")
  }
  return [min, max]
}

const isIndex = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= NO_VALUE

function lookup(dictionary: readonly string[], index: number, label: string) {
  if (index === NO_VALUE) return ""
  const value = dictionary.at(index)
  if (value === undefined) throw corrupt(label)
  return value
}

function readProduct(
  row: unknown,
  id: number,
  manufacturers: readonly string[],
  packaging: readonly string[],
  types: readonly string[]
): CatalogProduct {
  if (!Array.isArray(row) || row.length !== 6) {
    throw corrupt(`row ${id.toString()}`)
  }
  const cells: unknown[] = row
  const [
    name,
    ingredient,
    manufacturerIndex,
    packagingIndex,
    typeIndex,
    price,
  ] = cells

  if (
    typeof name !== "string" ||
    typeof ingredient !== "string" ||
    !isIndex(manufacturerIndex) ||
    !isIndex(packagingIndex) ||
    !isIndex(typeIndex) ||
    !isIndex(price)
  ) {
    throw corrupt(`row ${id.toString()}`)
  }

  return {
    id,
    name,
    ingredient,
    manufacturer: lookup(manufacturers, manufacturerIndex, "manufacturers"),
    packaging: lookup(packaging, packagingIndex, "packaging"),
    type: lookup(types, typeIndex, "types"),
    priceMills: price === NO_VALUE ? null : price,
  }
}

/**
 * Validates an untrusted catalog document.
 *
 * The artifact is plain JSON so the browser and the CDN both handle the
 * compression; there is no envelope to unwrap and no key to get wrong.
 */
export function parseCatalog(value: unknown): CatalogDataset {
  if (!isRecord(value) || value.format !== CATALOG_FORMAT) {
    throw new Error(
      `The catalog file has an unsupported format version. This build expects format ${CATALOG_FORMAT.toString()}. Rebuild it with \`npm run catalog:build\`.`
    )
  }

  const manufacturers = readStrings(value.manufacturers, "manufacturers")
  const packaging = readStrings(value.packaging, "packaging")
  const types = readStrings(value.types, "types")
  if (!Array.isArray(value.products)) throw corrupt("products")
  const rows: unknown[] = value.products

  return {
    manufacturers,
    packaging,
    types,
    priceBounds: readBounds(value.priceBounds),
    products: rows.map((row, id) =>
      readProduct(row, id, manufacturers, packaging, types)
    ),
  }
}

/**
 * `response.json()` lets the browser decode the body (and any gzip/brotli
 * encoding) off the main thread, which is far cheaper than building a
 * `DecompressionStream` pipeline by hand.
 */
export async function fetchCatalog(
  url: string,
  signal?: AbortSignal
): Promise<CatalogDataset> {
  let response: Response
  try {
    response = await fetch(url, {
      cache: "force-cache",
      credentials: "omit",
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new Error(
      "The catalog could not be downloaded. Check your connection and try again.",
      { cause: error }
    )
  }
  if (!response.ok) {
    throw new Error(
      `The catalog request failed (status ${response.status.toString()}).`
    )
  }

  let parsed: unknown
  try {
    parsed = await response.json()
  } catch (error) {
    throw new Error(
      "The catalog file is not valid JSON. Rebuild and redeploy it.",
      { cause: error }
    )
  }
  return parseCatalog(parsed)
}
