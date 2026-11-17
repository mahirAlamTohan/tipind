import { cva } from "class-variance-authority"
import { AlertCircle, CheckCircle2, LoaderCircle } from "lucide-react"

import { formatNumber, pluralize } from "@/lib/format"

import type { StatusTone } from "../lib/status"
import type { CatalogLoadStatus } from "../types"
import { catalogContent } from "../content"

const iconTile = cva(
  "grid size-9 place-items-center rounded-lg bg-card shadow-sm",
  {
    variants: {
      tone: {
        success: "text-success-700 dark:text-success-300",
        busy: "text-primary-text",
        error: "text-danger-700 dark:text-danger-300",
        muted: "text-muted-foreground",
      },
    },
  }
)

const statusText = cva("inline-flex items-center gap-2 font-semibold", {
  variants: {
    tone: {
      success: "text-success-800 dark:text-success-300",
      busy: "text-primary-text",
      error: "text-danger-700 dark:text-danger-300",
      muted: "text-muted-foreground",
    },
  },
})

function StatusIcon({
  className,
  tone,
}: {
  className: string
  tone: StatusTone
}) {
  if (tone === "busy") {
    return (
      <LoaderCircle
        aria-hidden="true"
        className={`${className} animate-spin`}
      />
    )
  }
  if (tone === "success")
    return <CheckCircle2 aria-hidden="true" className={className} />
  return <AlertCircle aria-hidden="true" className={className} />
}

interface CatalogStatProps {
  count: number
  status: CatalogLoadStatus
}

/** Product count badge in the card header. */
export function CatalogStat({ count, status }: CatalogStatProps) {
  const copy = catalogContent
  const tone: StatusTone =
    status === "ready"
      ? "success"
      : status === "loading"
        ? "busy"
        : status === "error"
          ? "error"
          : "muted"

  return (
    <div
      aria-live="polite"
      className="flex w-fit shrink-0 items-center rounded-xl"
    >
      <span className={iconTile({ tone })}>
        <StatusIcon className="size-4.25" tone={tone} />
      </span>
      <span className="flex flex-col leading-tight">
        <strong className="text-xs font-extrabold text-ink-soft">
          {formatNumber(count)}{" "}
          {pluralize(count, copy.productSingular, copy.productPlural)}
        </strong>
      </span>
    </div>
  )
}

interface CatalogStatusBarProps {
  message: string
  summary: string
  tone: StatusTone
}

export function CatalogStatusBar({
  message,
  summary,
  tone,
}: CatalogStatusBarProps) {
  return (
    <div
      aria-live="polite"
      className="flex min-h-10 flex-col justify-center gap-1 border-t border-border px-5 text-[0.68rem] sm:flex-row sm:items-center sm:justify-between sm:px-7"
    >
      <span className={statusText({ tone })}>
        {tone === "success" ? (
          <span className="size-1.5 rounded-full bg-success-500 ring-4 ring-success-500/15" />
        ) : (
          <StatusIcon className="size-3.5" tone={tone} />
        )}
        {message}
      </span>
      <span className="hidden text-muted-foreground sm:text-right md:block">
        {summary}
      </span>
    </div>
  )
}
