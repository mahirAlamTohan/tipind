"use client"

import { usePathname } from "next/navigation"
import { useEffect } from "react"

import { ErrorBoundary } from "@/components/error-boundary"

import { useCartStore } from "../cart-store"
import { DEFAULT_WIDTH, STORAGE_KEY } from "../constants"
import { isStorageWritable } from "../lib/store-storage"
import { clampWidth, readStoredWidth } from "../lib/width"
import type { CartState } from "../types"
import { CartFallback } from "./cart-fallback"
import { CartSidebar } from "./cart-sidebar"

/** Mount once in the layout: hydrates the cart, syncs tabs, drives the page offset. */
export function CartRoot() {
  const onCheckout = usePathname().startsWith("/checkout")

  useEffect(() => {
    const { persist } = useCartStore

    void Promise.resolve(persist.rehydrate()).then(() => {
      useCartStore.setState({
        isHydrated: true,
        isStorageAvailable: isStorageWritable(),
        width: clampWidth(readStoredWidth() ?? DEFAULT_WIDTH),
      })
    })

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY || event.key === null) {
        void persist.rehydrate()
      }
    }
    window.addEventListener("storage", onStorage)
    return () => {
      window.removeEventListener("storage", onStorage)
    }
  }, [])

  // main.css reads these to make room for the sidebar.
  useEffect(() => {
    const root = document.documentElement
    const apply = (state: CartState) => {
      root.dataset.cart = state.isOpen ? "open" : "closed"
      root.style.setProperty("--cart-width", `${state.width.toString()}px`)
    }

    apply(useCartStore.getState())
    const unsubscribe = useCartStore.subscribe((state, previous) => {
      if (state.isOpen !== previous.isOpen || state.width !== previous.width) {
        apply(state)
      }
    })
    return () => {
      unsubscribe()
      delete root.dataset.cart
      root.style.removeProperty("--cart-width")
    }
  }, [])

  return onCheckout ? null : (
    <ErrorBoundary fallback={() => <CartFallback />} label="cart">
      <CartSidebar />
    </ErrorBoundary>
  )
}
