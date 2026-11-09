import type { CartLineItem } from "../types"

// eslint-disable-next-line security/detect-unsafe-regex -- each repetition is anchored by a mandatory x/×/* literal, so there's no ambiguous partitioning of input between iterations (verified: O(n) on adversarial inputs, not exponential).
const PACK_PATTERN = /^\s*\d+(?:\s*[x×*]\s*\d+)*\s*(?:'?s\s*)?$/i

/** Units inside one packet: "1x10" -> 10, "1x1" -> 1. */
export function unitsPerPacket(packaging: string) {
  if (!PACK_PATTERN.test(packaging)) return 1

  const total = (packaging.match(/\d+/g) ?? []).reduce(
    (product, part) => product * Number(part),
    1
  )
  return Number.isSafeInteger(total) && total > 0 ? total : 1
}

/** Total units ordered: 10 packets of "1x10" -> 100. */
export const totalUnits = (item: CartLineItem) =>
  unitsPerPacket(item.packaging) * item.quantity

/** Used when a product has no type in the catalogue (985 rows). */
const FALLBACK_UNIT = "unit"

/**
 * Pluralizes a unit noun. Only two rules are needed for the whole taxonomy:
 * suppository -> suppositories, patch -> patches, everything else +s.
 * Note `syringe` and `cartridge` already carry the `e`, so they take a bare +s.
 */
export function pluralize(word: string) {
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  if (/(?:[sxz]|ch|sh)$/.test(word)) return `${word}es`
  return `${word}s`
}

/**
 * The unit noun for an order line: "30 tablets of 2 B12 TAB (1x15)".
 * `type` is the singular catalogue value; blank falls back to "unit".
 */
export function unitWord(type: string | null | undefined, count: number) {
  const single = type?.trim().toLowerCase() ?? ""
  const noun = single === "" ? FALLBACK_UNIT : single
  return count === 1 ? noun : pluralize(noun)
}
