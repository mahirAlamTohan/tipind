import { create } from "zustand"
import type { PersistStorage } from "zustand/middleware"
import { persist } from "zustand/middleware"

import {
  clampQuantity,
  createLineItem,
  packetCount,
  totalMills,
} from "./lib/line-items"
import type { CartLineItem, CartState } from "./types"

import {
  DEFAULT_WIDTH,
  MAX_LINE_ITEMS,
  MAX_QUANTITY,
  STORAGE_KEY,
  STORAGE_VERSION,
} from "./constants"
import { clampWidth } from "./lib/width"
import { parseItems, serializeItems } from "./lib/store-storage"

interface PersistedCart {
  items: readonly CartLineItem[]
}

let lastWritten = ""

/** Reads and writes through the validating parser, never raw JSON. */
export const cartStorage: PersistStorage<PersistedCart> = {
  getItem: (name) => {
    try {
      const items = parseItems(window.localStorage.getItem(name))
      return { state: { items }, version: STORAGE_VERSION }
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    const serialized = serializeItems(value.state.items)
    if (serialized === lastWritten) return
    try {
      window.localStorage.setItem(name, serialized)
      lastWritten = serialized
    } catch {
      if (useCartStore.getState().isStorageAvailable) {
        useCartStore.setState({ isStorageAvailable: false })
      }
    }
  },
  removeItem: (name) => {
    lastWritten = ""
    try {
      window.localStorage.removeItem(name)
    } catch {
      // Nothing to clean up.
    }
  },
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      isHydrated: false,
      isStorageAvailable: true,
      width: DEFAULT_WIDTH,

      actions: {
        addProduct: (product) => {
          const { isHydrated, items } = get()
          if (!isHydrated) return "unavailable"

          const line = createLineItem(product)
          if (!line) return "unavailable"

          const existing = items.find((item) => item.id === line.id)
          if (existing) {
            if (existing.quantity >= MAX_QUANTITY) return "limit"
            set({
              items: items.map((item) =>
                item.id === line.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
            })
            return "updated"
          }

          if (items.length >= MAX_LINE_ITEMS) return "limit"
          set({ items: [...items, line] })
          return "added"
        },
        setQuantity: (id, quantity) => {
          const next = clampQuantity(quantity)
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, quantity: next } : item
            ),
          }))
        },
        removeItem: (id) => {
          set((state) => ({
            items: state.items.filter((item) => item.id !== id),
          }))
        },
        clear: () => {
          set({ items: [] })
        },
        setOpen: (open) => {
          set({ isOpen: open })
        },
        toggle: () => {
          set((state) => ({ isOpen: !state.isOpen }))
        },
        setWidth: (width) => {
          set({ width: clampWidth(width) })
        },
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state): PersistedCart => ({ items: state.items }),
      // Hydrated manually after mount so server and client markup match.
      skipHydration: true,
      storage: cartStorage,
      version: STORAGE_VERSION,
    }
  )
)

export const selectPacketCount = (state: CartState) => packetCount(state.items)
export const selectTotalMills = (state: CartState) => totalMills(state.items)
