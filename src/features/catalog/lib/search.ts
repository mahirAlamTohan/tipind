import type { CatalogProduct, SearchQuery } from "../types"

const WORD_CHAR = /[\p{L}\p{N}]/u
const WORDS = /[\p{L}\p{N}]+/gu

/**
 * Field priority order — lower index = higher priority.
 * Packaging and price are only enabled when the query contains digits.
 */
const FIELD_ORDER = ["name", "ingredient", "manufacturer", "packaging", "price"] as const

const QUALITY_UNIT = 100
const COMPACT_SCORE = 5

const ACCENTS = /[\u0300-\u036f]/g
const NON_WORD = /[^\p{L}\p{N}]/gu

interface Folded {
  text: string
  /** For each character of `text`, where it starts/ends in the original. */
  starts: number[]
  ends: number[]
}

/**
 * Fast fold for indexing: lowercased, accent-stripped, all non-word chars
 * dropped when `compact`. Runs over all products x 5 fields.
 */
function foldFast(source: string, compact = false) {
  const text = source.toLocaleLowerCase().normalize("NFKD").replace(ACCENTS, "")
  return compact ? text.replace(NON_WORD, "") : text
}

/**
 * Same folding but remembers character offsets, used only for the handful of
 * rows actually on screen so matches can be mapped back for highlighting.
 */
function fold(source: string, compact = false): Folded {
  let text = ""
  const starts: number[] = []
  const ends: number[] = []
  let offset = 0

  for (const char of source) {
    const end = offset + char.length
    const folded = char
      .toLocaleLowerCase()
      .normalize("NFKD")
      .replace(ACCENTS, "")

    for (const piece of folded) {
      if (compact && !WORD_CHAR.test(piece)) continue
      for (const _unit of piece) {
        starts.push(offset)
        ends.push(end)
      }
      text += piece
    }
    offset = end
  }

  return { ends, starts, text }
}

export const EMPTY_QUERY: SearchQuery = { compact: "", terms: [] }

export function parseQuery(raw: string): SearchQuery {
  const terms = [...new Set(foldFast(raw).match(WORDS) ?? [])]
  return { compact: terms.length > 1 ? terms.join("") : "", terms }
}

interface IndexedRow {
  readonly product: CatalogProduct
  readonly folded: readonly string[]
  readonly compact: readonly string[]
}

function toRow(product: CatalogProduct): IndexedRow {
  const fields = [
    product.name,
    product.ingredient,
    product.manufacturer,
    product.packaging,
    product.priceMills !== null ? String(product.priceMills) : "",
  ]
  return {
    compact: fields.map((field) => foldFast(field, true)),
    folded: fields.map((field) => foldFast(field)),
    product,
  }
}

const indexes = new WeakMap<readonly CatalogProduct[], IndexedRow[]>()

function indexFor(products: readonly CatalogProduct[]) {
  let index = indexes.get(products)
  if (!index) {
    index = products.map(toRow)
    indexes.set(products, index)
  }
  return index
}

/** 3 = whole word, 2 = start of a word, 1 = inside a word, 0 = absent. */
function quality(text: string, term: string) {
  let best = 0
  let from = 0

  for (;;) {
    const at = text.indexOf(term, from)
    if (at < 0) return best

    const startsWord = at === 0 || !WORD_CHAR.test(text.charAt(at - 1))
    const after = at + term.length
    const endsWord = after >= text.length || !WORD_CHAR.test(text.charAt(after))
    const found = startsWord ? (endsWord ? 3 : 2) : 1

    if (found === 3) return 3
    best = Math.max(best, found)
    from = at + 1
  }
}

/**
 * Modular ranking system.
 *
 * Sort order (highest to lowest):
 *   1. Primary field tier — name > ingredient > manufacturer > packaging > price
 *      (packaging/price only enabled when the query contains digits)
 *   2. Match quality in the primary field — whole word > word start > inside word
 *   3. Number of terms matched in the primary field (more = better)
 *   4. Total weighted score across all matched fields
 *   5. Product id (stable tie-breaker)
 *
 * Every term must appear in at least one enabled field. A multi-word query can
 * also match with spaces removed (compact), e.g. "as life" finds
 * "A. S Lifesciences"; compact matches rank below all regular matches.
 */
export function searchProducts(
  products: readonly CatalogProduct[],
  query: SearchQuery
): CatalogProduct[] {
  const hasDigits = query.terms.some((term) => /\d/.test(term))
  const enabledFields = hasDigits ? FIELD_ORDER : FIELD_ORDER.slice(0, 3)

  const hits: {
    product: CatalogProduct
    primaryField: number
    primaryQuality: number
    primaryTermCount: number
    totalScore: number
  }[] = []

  for (const row of indexFor(products)) {
    let allMatched = true
    let primaryField = -1
    let primaryQuality = 0
    let primaryTermCount = 0
    let totalScore = 0

    for (const term of query.terms) {
      let termBestQuality = 0
      let termBestField = -1

      for (let i = 0; i < enabledFields.length; i++) {
        const q = quality(row.folded[i], term)
        if (
          q > 0 &&
          (q > termBestQuality || (q === termBestQuality && i < termBestField))
        ) {
          termBestQuality = q
          termBestField = i
        }
      }

      if (termBestQuality === 0) {
        allMatched = false
        break
      }

      // Weighted score: higher tier (lower i) contributes more.
      totalScore += termBestQuality * (enabledFields.length - termBestField)

      // Track the primary field: highest-priority field where any term matches.
      if (primaryField === -1 || termBestField < primaryField) {
        primaryField = termBestField
        primaryQuality = termBestQuality
        primaryTermCount = 1
      } else if (termBestField === primaryField) {
        primaryTermCount++
        primaryQuality = Math.max(primaryQuality, termBestQuality)
      }
    }

    if (!allMatched && query.compact) {
      const matched = row.compact.some((text) => text.includes(query.compact))
      if (!matched) continue
      // Compact matches rank below all regular matches.
      primaryField = enabledFields.length
      primaryQuality = 1
      primaryTermCount = 0
      totalScore = COMPACT_SCORE
    }

    if (!allMatched) continue

    hits.push({ product: row.product, primaryField, primaryQuality, primaryTermCount, totalScore })
  }

  hits.sort((a, b) => {
    if (a.primaryField !== b.primaryField) return a.primaryField - b.primaryField
    if (b.primaryQuality !== a.primaryQuality) return b.primaryQuality - a.primaryQuality
    if (b.primaryTermCount !== a.primaryTermCount) return b.primaryTermCount - a.primaryTermCount
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore
    return a.product.id - b.product.id
  })

  return hits.map((hit) => hit.product)
}

type Range = [start: number, end: number]

function collect(folded: Folded, needle: string, into: Range[]) {
  if (!needle) return
  let from = 0
  for (;;) {
    const at = folded.text.indexOf(needle, from)
    if (at < 0) return
    const start = folded.starts.at(at)
    const end = folded.ends.at(at + needle.length - 1)
    if (start !== undefined && end !== undefined) into.push([start, end])
    from = at + 1
  }
}

/** Character ranges of `text` that match the query (merged, sorted). */
export function findRanges(text: string, query: SearchQuery): Range[] {
  if (!text || query.terms.length === 0) return []

  const ranges: Range[] = []
  const plain = fold(text)
  for (const term of query.terms) collect(plain, term, ranges)
  if (query.compact) collect(fold(text, true), query.compact, ranges)

  ranges.sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const merged: Range[] = []
  for (const range of ranges) {
    const last = merged.at(-1)
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1])
    else merged.push([range[0], range[1]])
  }
  return merged
}

/** Shortens long text, keeping the first match visible when there is one. */
export function excerpt(text: string, query: SearchQuery, max = 112) {
  const value = text.trim()
  if (value.length <= max) return value

  const hit = findRanges(value, query).at(0)?.[0] ?? -1
  const start = hit >= max - 16 ? Math.max(0, hit - 36) : 0
  const end = start + max
  let slice = value.slice(start, end)

  if (start > 0) slice = slice.slice(slice.indexOf(" ") + 1)
  if (end < value.length) {
    const cut = slice.lastIndexOf(" ")
    if (cut > max * 0.6) slice = slice.slice(0, cut)
  }

  return `${start > 0 ? "…" : ""}${slice.trim()}${end < value.length ? "…" : ""}`
}
