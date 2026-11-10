import { siteConfig } from "@/config/site"
import { isRecord } from "@/lib/guards"

import { CATALOG_FORMAT, CATALOG_MAGIC, NO_VALUE } from "../constants"
import type { CatalogDataset, CatalogProduct, PriceRange } from "../types"

const corrupt = (detail: string) =>
  new Error(
    `The catalog file is corrupted (${detail}). Rebuild and redeploy it.`
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
  types: readonly string[],
  priceBounds: PriceRange
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

  const priceMills = price === NO_VALUE ? null : price
  // The artifact's own price bounds are part of the contract; a row outside
  // them means the file (or the build that wrote it) is wrong. Failing closed
  // is better than rendering a price the cart will silently refuse.
  if (
    priceMills !== null &&
    (priceMills <= 0 ||
      priceMills < priceBounds[0] ||
      priceMills > priceBounds[1])
  ) {
    throw corrupt(`price in row ${id.toString()}`)
  }

  return {
    id,
    name,
    ingredient,
    manufacturer: lookup(manufacturers, manufacturerIndex, "manufacturers"),
    packaging: lookup(packaging, packagingIndex, "packaging"),
    type: lookup(types, typeIndex, "types"),
    priceMills,
  }
}

export function parseCatalog(value: unknown): CatalogDataset {
  if (!isRecord(value) || value.format !== CATALOG_FORMAT) {
    throw new Error(
      "The catalog file has an unsupported format version. Rebuild it with `bun run catalog:build`."
    )
  }

  const manufacturers = readStrings(value.manufacturers, "manufacturers")
  const packaging = readStrings(value.packaging, "packaging")
  const types = readStrings(value.types, "types")
  const priceBounds = readBounds(value.priceBounds)
  if (!Array.isArray(value.products)) throw corrupt("products")
  const rows: unknown[] = value.products

  return {
    manufacturers,
    packaging,
    types,
    priceBounds,
    products: rows.map((row, id) =>
      readProduct(row, id, manufacturers, packaging, types, priceBounds)
    ),
  }
}

function unmask(bytes: Uint8Array<ArrayBuffer>) {
  const magic = new TextDecoder().decode(
    bytes.subarray(0, CATALOG_MAGIC.length)
  )
  if (magic !== CATALOG_MAGIC) {
    throw new Error(
      "The catalog file is not in the expected format. Rebuild it with `bun run catalog:build`."
    )
  }

  const key = siteConfig.catalog.xorKey
  if (!key) {
    throw new Error("NEXT_PUBLIC_CATALOG_XOR_KEY is not set in this build.")
  }
  const keyBytes = new TextEncoder().encode(key)

  return bytes
    .subarray(CATALOG_MAGIC.length)
    .map((byte, index) => byte ^ (keyBytes.at(index % keyBytes.length) ?? 0))
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>) {
  const stream = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
  return new Response(stream).text()
}

export async function fetchCatalog(
  url: string,
  signal?: AbortSignal
): Promise<CatalogDataset> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This browser can't open the catalog. Please update it.")
  }

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

  const payload = unmask(new Uint8Array(await response.arrayBuffer()))

  let text: string
  try {
    text = await gunzip(payload)
  } catch {
    throw new Error(
      "The catalog could not be decoded. NEXT_PUBLIC_CATALOG_XOR_KEY may not match the key it was built with."
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw corrupt("invalid JSON")
  }
  return parseCatalog(parsed)
}
