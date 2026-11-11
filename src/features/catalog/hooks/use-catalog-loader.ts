"use client"

import { useEffect } from "react"

import { errorMessage } from "@/lib/guards"

import { fetchCatalog } from "../lib/load-catalog"
import { useCatalogStore } from "../store/catalog-store"
import type { CatalogLoadStatus } from "../types"

/** Loads the catalog into the store; returns the effective status. */
export function useCatalogLoader(url: string): CatalogLoadStatus {
  const status = useCatalogStore((state) => state.status)

  useEffect(() => {
    if (!url) return

    // ── Skip if data is already in the store ──
    if (useCatalogStore.getState().dataset) return

    const controller = new AbortController()
    const { loadFailed, loadStarted, loadSucceeded } =
      useCatalogStore.getState().actions

    loadStarted()
    fetchCatalog(url, controller.signal)
      .then((dataset) => {
        if (!controller.signal.aborted) loadSucceeded(dataset)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        loadFailed(errorMessage(error, "The catalog could not be loaded."))
      })

    return () => {
      controller.abort()
    }
  }, [url])

  return url ? status : "unconfigured"
}
