"use client"

import dynamic from "next/dynamic"
import { useSyncExternalStore } from "react"

import { useCartStore } from "@/features/cart/cart-store"

/**
 * `sonner` is ~10 kB gzipped and only ever renders a toast after the visitor
 * adds something to the cart. Loading it on demand keeps it out of the first
 * paint, where it used to sit in the root layout.
 */
const Toaster = dynamic(
  () => import("./sonner").then((module) => module.Toaster),
  { ssr: false }
)

const noSubscribe = () => () => undefined

interface LazyToasterProps {
  className?: string
}

export function LazyToaster({ className }: LazyToasterProps) {
  // `items.length > 0` is a different answer on the client than at build time,
  // so read it through useSyncExternalStore: the server snapshot is always
  // false (nothing rendered) and React swaps to the client value on hydrate.
  const hasItems = useSyncExternalStore(
    noSubscribe,
    () => useCartStore.getState().items.length > 0,
    () => false
  )

  if (!hasItems) return null
  return <Toaster className={className} />
}
