"use client"

import { useState, type ReactNode } from "react"

import { cn } from "cn"

interface VirtualListProps<T> {
  className?: string
  /** Max height of the scroll area in px. */
  height: number
  itemHeight: number
  items: readonly T[]
  overscan?: number
  getKey: (item: T) => string
  renderItem: (item: T) => ReactNode
}

/** Fixed-row-height windowing. Remount it (via `key`) to reset the scroll. */
export function VirtualList<T>({
  className,
  getKey,
  height,
  itemHeight,
  items,
  overscan = 5,
  renderItem,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)

  const first = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const last = Math.min(
    items.length,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  )

  return (
    <div
      className={cn("overflow-y-auto", className)}
      onScroll={(event) => {
        setScrollTop(event.currentTarget.scrollTop)
      }}
      style={{ maxHeight: height }}
    >
      <div style={{ height: items.length * itemHeight }}>
        <div
          style={{
            transform: `translateY(${(first * itemHeight).toString()}px)`,
          }}
        >
          {items.slice(first, last).map((item) => (
            <div key={getKey(item)} style={{ height: itemHeight }}>
              {renderItem(item)}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
