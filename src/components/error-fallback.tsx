"use client"

import Link from "next/link"
import { AlertTriangle, ArrowLeft, RotateCcw } from "lucide-react"

import { Container } from "@/components/ui/container"
import { siteContent } from "@/config/content"

const copy = siteContent.ui

const primaryAction =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/15 transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
const secondaryAction =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-input bg-background px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"

interface ErrorPanelProps {
  description: string
  title: string
  onRetry?: (() => void) | undefined
}

/** In-page fallback: a failed island keeps the rest of the page usable. */
export function ErrorPanel({ description, onRetry, title }: ErrorPanelProps) {
  return (
    <div
      className="mx-auto max-w-lg rounded-3xl border border-danger-200 bg-danger-50/70 p-6 text-center dark:border-danger-900 dark:bg-danger-950/40"
      role="alert"
    >
      <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-danger-200 bg-background text-danger-700 dark:border-danger-900 dark:text-danger-300">
        <AlertTriangle aria-hidden="true" className="size-5" />
      </span>
      <h2 className="m-0 font-display text-lg font-extrabold tracking-tight text-ink">
        {title}
      </h2>
      <p className="mx-auto mt-1.5 max-w-sm text-xs leading-5 text-muted-foreground">
        {description}
      </p>
      {onRetry && (
        <button
          className={`${primaryAction} mt-5`}
          onClick={onRetry}
          type="button"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          {copy.errorRetry}
        </button>
      )}
    </div>
  )
}

interface ErrorScreenProps {
  description: string
  title: string
  onRetry?: (() => void) | undefined
}

/** Route-level fallback for `app/error.tsx` and `app/checkout/error.tsx`. */
export function ErrorScreen({ description, onRetry, title }: ErrorScreenProps) {
  return (
    <main className="grid min-h-[70dvh] place-items-center bg-linear-to-b from-surface-tint to-background py-20">
      <Container className="text-center">
        <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl border border-danger-200 bg-danger-50 text-danger-700 dark:border-danger-900 dark:bg-danger-950 dark:text-danger-300">
          <AlertTriangle aria-hidden="true" className="size-6" />
        </span>
        <h1 className="mx-auto max-w-xl font-display text-[clamp(1.7rem,4vw,2.4rem)] leading-tight font-extrabold tracking-[-0.04em] text-ink">
          {title}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-muted-foreground">
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {onRetry && (
            <button className={primaryAction} onClick={onRetry} type="button">
              <RotateCcw aria-hidden="true" className="size-4" />
              {copy.errorRetry}
            </button>
          )}
          <Link className={secondaryAction} href="/">
            <ArrowLeft aria-hidden="true" className="size-4" />
            {copy.errorHome}
          </Link>
        </div>
      </Container>
    </main>
  )
}
