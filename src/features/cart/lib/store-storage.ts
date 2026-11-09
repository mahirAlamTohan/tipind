import { isRecord } from "@/lib/guards"

import {
  MAX_LINE_ITEMS,
  MAX_UNIT_PRICE_MILLS,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "../constants"
import type { CartLineItem } from "../types"
import { clampQuantity, clip, lineItemId } from "./line-items"

function readItem(candidate: unknown): CartLineItem | null {
  if (!isRecord(candidate)) return null
  const {
    ingredient,
    manufacturer,
    name,
    packaging,
    quantity,
    type,
    unitPriceMills,
  } = candidate

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof ingredient !== "string" ||
    typeof manufacturer !== "string" ||
    typeof packaging !== "string" ||
    typeof unitPriceMills !== "number" ||
    !Number.isSafeInteger(unitPriceMills) ||
    unitPriceMills < 0 ||
    unitPriceMills > MAX_UNIT_PRICE_MILLS ||
    typeof quantity !== "number" ||
    !Number.isFinite(quantity)
  ) {
    return null
  }

  const details = {
    ingredient: clip(ingredient),
    manufacturer: clip(manufacturer),
    name: clip(name),
    packaging: clip(packaging),
    type: typeof type === "string" ? clip(type) : "",
    unitPriceMills,
  }
  // Never trust a stored id; derive it again.
  return {
    ...details,
    id: lineItemId(details),
    quantity: clampQuantity(quantity),
  }
}

/** Validates untrusted data, merges duplicates, enforces limits. */
export function normalizeItems(value: unknown): CartLineItem[] {
  if (!Array.isArray(value)) return []
  const candidates: unknown[] = value
  const merged = new Map<string, CartLineItem>()

  for (const candidate of candidates) {
    const item = readItem(candidate)
    if (!item) continue

    const existing = merged.get(item.id)
    if (existing) {
      merged.set(item.id, {
        ...existing,
        quantity: clampQuantity(existing.quantity + item.quantity),
      })
    } else if (merged.size < MAX_LINE_ITEMS) {
      merged.set(item.id, item)
    }
  }

  return [...merged.values()]
}

export function serializeItems(items: readonly CartLineItem[]) {
  return JSON.stringify({
    items: normalizeItems(items),
    version: STORAGE_VERSION,
  })
}

export function parseItems(raw: string | null): CartLineItem[] {
  if (!raw || raw.length > 2_000_000) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return []
    return normalizeItems(parsed.items)
  } catch {
    return []
  }
}

/** True when localStorage can be written (false in some private modes). */
export function isStorageWritable() {
  try {
    const probe = `${STORAGE_KEY}:probe`
    window.localStorage.setItem(probe, "1")
    window.localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}
