import type { CatalogProduct, SearchQuery } from "../types"

const WORD_CHAR = /[\p{L}\p{N}]/u
const WORDS = /[\p{L}\p{N}]+/gu

/** Column order: name, ingredient, manufacturer, packaging. */
const FIELD_WEIGHTS = [4, 3, 2, 1] as const
/** Quality (whole word / word start / inside a word) outranks the column. */
const QUALITY_UNIT = 10
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
 * The search index only needs the folded text, never the position maps, and it
 * runs over all 8522 products x 4 fields. Folding the whole string at once is
 * ~10x faster than the per-character loop below (measured 245 ms -> 25 ms on
 * the real catalog) and allocates nothing extra.
 * With `compact`, everything except letters and digits is dropped.
 */
function foldFast(source: string, compact = false) {
  const text = source.toLocaleLowerCase().normalize("NFKD").replace(ACCENTS, "")
  return compact ? text.replace(NON_WORD, "") : text
}

/**
 * Same folding, but remembers where each folded character came from, so a match
 * in the folded text can be mapped back onto the original for highlighting.
 * Only used for the handful of rows that are actually on screen.
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
 * Every word must appear (as a substring) in some column. Best matches first:
 * whole words, then word starts, then partial matches; ties go to the more
 * important column (name > ingredient > manufacturer > pack).
 * A multi-word query also matches with its spaces removed, so "as life"
 * finds "A. S Lifesciences".
 */
export function searchProducts(
  products: readonly CatalogProduct[],
  query: SearchQuery
): CatalogProduct[] {
  const hits: { product: CatalogProduct; score: number }[] = []

  for (const row of indexFor(products)) {
    let score = 0
    let matched = true

    for (const term of query.terms) {
      let best = 0
      for (const [column, text] of row.folded.entries()) {
        const found = quality(text, term)
        if (found === 0) continue
        const weight = FIELD_WEIGHTS.at(column) ?? 0
        best = Math.max(best, found * QUALITY_UNIT + weight)
      }
      if (best === 0) {
        matched = false
        break
      }
      score += best
    }

    if (!matched && query.compact) {
      matched = row.compact.some((text) => text.includes(query.compact))
      score = COMPACT_SCORE
    }

    if (matched) hits.push({ product: row.product, score })
  }

  hits.sort((a, b) => b.score - a.score || a.product.id - b.product.id)
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
    from = at + needle.length
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
