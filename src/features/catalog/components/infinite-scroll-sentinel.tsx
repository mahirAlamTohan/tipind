// components/infinite-scroll-sentinel.tsx
"use client"

import { useEffect, useRef, type RefObject } from "react"
import { Loader2 } from "lucide-react"

interface InfiniteScrollSentinelProps {
  hasMore: boolean
  onLoadMore: () => void
  /** The scroll container to observe against. Falls back to viewport if null. */
  scrollRef?: RefObject<HTMLElement | null>
  rootMargin?: string
}

export function InfiniteScrollSentinel({
  hasMore,
  onLoadMore,
  scrollRef,
  rootMargin = "200px",
}: InfiniteScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      {
        root: scrollRef?.current ?? null, // ← key change
        rootMargin,
      }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [hasMore, onLoadMore, rootMargin, scrollRef])

  if (!hasMore) return null

  return (
    <div ref={ref} className="flex items-center justify-center py-6">
      <Loader2
        aria-label="Loading more products"
        className="size-5 animate-spin text-muted-foreground"
      />
    </div>
  )
}
