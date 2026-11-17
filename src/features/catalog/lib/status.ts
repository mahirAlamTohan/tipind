import { formatMessage, formatNumber } from "@/lib/format"

import type { CatalogLoadStatus } from "../types"
import { catalogContent } from "../content"

export type StatusTone = "success" | "busy" | "error" | "muted"

interface StatusInput {
  productCount: number
  status: CatalogLoadStatus
}

export function getStatusView({ productCount, status }: StatusInput): {
  tone: StatusTone
  message: string
} {
  const copy = catalogContent.status

  switch (status) {
    case "unconfigured":
      return { tone: "muted", message: copy.unconfigured }
    case "loading":
      return { tone: "busy", message: copy.loading }
    case "ready":
      return {
        tone: "success",
        message: formatMessage(copy.loaded, {
          count: formatNumber(productCount),
        }),
      }
    case "error":
      return { tone: "error", message: copy.error }
  }
}

export function getEmptyView({ productCount, status }: StatusInput) {
  const copy = catalogContent

  if (status === "loading") {
    return { title: copy.status.loading, description: "" }
  }
  if (status === "unconfigured") {
    return {
      title: copy.noCatalogRecordsTitle,
      description: copy.noCatalogConfiguredDescription,
    }
  }
  if (status === "error") {
    return {
      title: copy.noCatalogRecordsTitle,
      description: copy.noCatalogUnavailableDescription,
    }
  }
  if (productCount === 0) {
    return {
      title: copy.noCatalogRecordsTitle,
      description: copy.noCatalogRecordsDescription,
    }
  }
  return { title: copy.emptyTitle, description: copy.emptyDescription }
}
