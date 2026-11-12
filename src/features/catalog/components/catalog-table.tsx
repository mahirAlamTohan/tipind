"use client"
import { CircleCheck, Plus } from "lucide-react"
import { type RefObject, useState } from "react"

import { Button } from "@/components/ui/button"
import { siteContent } from "@/config/content"
import { formatMessage, formatMills, formatNumber } from "@/lib/format"
import type { CatalogProduct, SearchQuery } from "../types"

import { excerpt } from "../lib/search"
import { HighlightedText } from "./highlighted-text"
import { formatTip, Tooltip } from "@/components/ui/tooltip"
import { InfiniteScrollSentinel } from "./infinite-scroll-sentinel"
import { useCartStore } from "@/features/cart/cart-store"
import { productLineId, quantityOf } from "@/features/cart/lib/line-items"
import { toast } from "sonner"

const th =
  "px-4 py-3 text-[0.62rem] font-extrabold tracking-[0.075em] text-muted-foreground uppercase"

function AddToCartButton({
  onAdded,
  product,
}: {
  onAdded: (name: string) => void
  product: CatalogProduct
}) {
  const copy = siteContent.catalog
  const lineId = productLineId(product)
  const isHydrated = useCartStore((state) => state.isHydrated)
  const addProduct = useCartStore((state) => state.actions.addProduct)
  const quantity = useCartStore((state) => quantityOf(state.items, lineId))

  const label = formatMessage(
    lineId ? copy.addToCartAriaLabel : copy.unavailablePriceAriaLabel,
    { product: product.name }
  )
  const tip =
    lineId === null
      ? copy.addTip.unavailable
      : quantity > 0
        ? formatTip(copy.addTip.more, { count: formatNumber(quantity) })
        : copy.addTip.add

  return (
    // `wrap`: a disabled button gets no pointer events, so the wrapper owns the tooltip.
    <Tooltip content={tip} wrap side="right">
      <Button
        aria-label={label}
        className="relative size-8 shrink-0 rounded-lg p-0 text-primary-text"
        disabled={!isHydrated || lineId === null}
        onClick={() => {
          if (addProduct(product)) {
            onAdded(product.name)
            toast.success("item added", {
              description: `${product.name} (${product.priceMills ? formatMills(product.priceMills) : ""}) added to cart`,
              position: "bottom-left",
              dismissible: true,
              closeButton: true,
              icon: (
                <CircleCheck
                  aria-hidden="true"
                  className="size-6 stroke-success-500"
                />
              ),
              classNames: {
                title:
                  "ml-2 text-sm font-semibold text-success-950! dark:text-success-100!",
                closeButton:
                  "bg-success-100! dark:bg-success-900! size-6! shadow",
                toast:
                  "bg-success-50! dark:bg-success-950/70! backdrop-blur-sm! shadow-lg! dark:shadow-none!",
              },
            })
          }
        }}
        size="icon"
        variant="outline"
      >
        <Plus aria-hidden="true" />
        {quantity > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1.5 -right-1.5 grid min-w-4.5 place-items-center rounded-full bg-primary px-1 text-[0.58rem] leading-4.5 font-extrabold text-primary-foreground"
          >
            {quantity > 99 ? "99+" : quantity.toString()}
          </span>
        )}
      </Button>
    </Tooltip>
  )
}

function Price({ mills }: { mills: number | null }) {
  return <>{mills === null ? "—" : formatMills(mills)}</>
}

interface CatalogTableProps {
  rows: readonly CatalogProduct[]
  query: SearchQuery
  hasMore: boolean
  onLoadMore: () => void
  scrollRef?: RefObject<HTMLElement | null>
}

/**
 * Cards or table depending on the width of the results area (container
 * query), so it adapts when the cart sidebar is open.
 * The parent must have the `@container` class.
 */
export function CatalogTable({
  rows,
  query,
  hasMore,
  onLoadMore,
  scrollRef,
}: CatalogTableProps) {
  const copy = siteContent.catalog
  const [announcement, setAnnouncement] = useState("")

  function handleAdded(name: string) {
    setAnnouncement(
      formatMessage(copy.addedToCartAnnouncement, { product: name })
    )
  }

  return (
    <>
      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      {/* ── Card view (mobile) ── */}
      <ul className="divide-y divide-border/70 @4xl:hidden">
        {rows.map((product) => (
          <li className="space-y-2 px-5 py-4 sm:px-7" key={product.id}>
            {/* … card content unchanged … */}
            <div className="flex items-start justify-between gap-3">
              <h4 className="m-0 min-w-0 text-sm font-bold text-primary-900 dark:text-primary-100">
                <HighlightedText query={query} text={product.name} />
              </h4>
              <AddToCartButton onAdded={handleAdded} product={product} />
            </div>
            <p className="m-0 line-clamp-2 text-[0.7rem] leading-5 text-muted-foreground">
              <HighlightedText
                query={query}
                text={excerpt(product.ingredient, query)}
              />
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[0.68rem] font-semibold text-neutral-600 dark:text-neutral-300">
              <span className="min-w-0">
                <HighlightedText query={query} text={product.manufacturer} />
              </span>
              <span className="inline-flex items-center gap-2">
                {product.packaging && (
                  <span className="rounded-md border border-primary-100 bg-primary-50 px-2 py-0.5 text-[0.62rem] font-bold dark:border-primary-900 dark:bg-primary-950/70 dark:text-primary-200">
                    <HighlightedText query={query} text={product.packaging} />
                  </span>
                )}
                <span className="text-sm font-extrabold text-primary-text tabular-nums">
                  <Price mills={product.priceMills} />
                </span>
              </span>
            </div>
          </li>
        ))}
        <li aria-hidden="true" className="list-none">
          <InfiniteScrollSentinel
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            scrollRef={scrollRef}
          />
        </li>
      </ul>

      {/* ── Table view (desktop) ── */}
      <div
        aria-label={copy.tableRegionLabel}
        className="hidden overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring @4xl:block"
        role="region"
        tabIndex={0}
      >
        <table className="w-full min-w-4xl border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-neutral-50 dark:bg-neutral-900/70">
            <tr className="border-y border-border">
              <th className={`${th} w-[23%]`} scope="col">
                {copy.tableHeadings.product}
              </th>
              <th className={`${th} w-[30%]`} scope="col">
                {copy.tableHeadings.ingredient}
              </th>
              <th className={`${th} w-[20%]`} scope="col">
                {copy.tableHeadings.manufacturer}
              </th>
              <th className={`${th} w-30`} scope="col">
                {copy.tableHeadings.packaging}
              </th>
              <th className={`${th} text-right`} scope="col">
                {copy.tableHeadings.rate}
              </th>
              <th className={`${th} pr-7 text-right`} scope="col">
                {copy.tableHeadings.addToCartButton}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((product) => (
              <tr
                className="border-b border-border/70 transition-colors last:border-0 hover:bg-primary-50/60 dark:hover:bg-primary-950/30"
                key={product.id}
              >
                <td className="px-4 py-3.5 text-xs font-bold text-primary-900 dark:text-primary-100">
                  <HighlightedText query={query} text={product.name} />
                </td>
                <td
                  className="max-w-90 px-4 py-3.5 text-[0.68rem] leading-5 font-semibold text-neutral-600 dark:text-neutral-300"
                  title={product.ingredient}
                >
                  <span className="line-clamp-2">
                    <HighlightedText
                      query={query}
                      text={excerpt(product.ingredient, query)}
                    />
                  </span>
                </td>
                <td className="max-w-55 px-4 py-3.5 text-[0.68rem] leading-5 font-semibold text-neutral-600 dark:text-neutral-300">
                  <HighlightedText query={query} text={product.manufacturer} />
                </td>
                <td className="px-4 py-3.5">
                  <span className="inline-flex min-h-6 items-center rounded-md border border-primary-100 bg-primary-50 px-2 text-[0.62rem] font-bold whitespace-nowrap text-neutral-600 dark:border-primary-900 dark:bg-primary-950/70 dark:text-primary-200">
                    <HighlightedText query={query} text={product.packaging} />
                  </span>
                </td>
                <td className="px-4 py-3.5 text-right text-xs font-extrabold whitespace-nowrap text-primary-text tabular-nums">
                  <Price mills={product.priceMills} />
                </td>
                <td className="py-3.5 pr-7">
                  <div className="flex justify-end">
                    <AddToCartButton onAdded={handleAdded} product={product} />
                  </div>
                </td>
              </tr>
            ))}
            {hasMore && (
              <tr aria-hidden="true">
                <td colSpan={6}>
                  <InfiniteScrollSentinel
                    hasMore={hasMore}
                    onLoadMore={onLoadMore}
                    scrollRef={scrollRef}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}
