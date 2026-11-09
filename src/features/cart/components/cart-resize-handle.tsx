"use client"

import type { KeyboardEvent, PointerEvent } from "react"

import { useCartStore } from "../cart-store"
import { DEFAULT_WIDTH, MIN_WIDTH } from "../constants"
import { cartContent } from "../content"
import { maxWidth, storeWidth } from "../lib/width"

const KEY_STEP = 24

export function CartResizeHandle() {
  const width = useCartStore((state) => state.width)
  const setWidth = useCartStore((state) => state.actions.setWidth)

  function commit(next: number) {
    setWidth(next)
    storeWidth(useCartStore.getState().width)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    document.documentElement.dataset.resizing = ""
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    setWidth(document.documentElement.clientWidth - event.clientX)
  }

  function onPointerEnd(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
    event.currentTarget.releasePointerCapture(event.pointerId)
    delete document.documentElement.dataset.resizing
    storeWidth(useCartStore.getState().width)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    // The panel is on the right, so moving its edge left makes it wider.
    switch (event.key) {
      case "ArrowLeft":
        commit(width + KEY_STEP)
        break
      case "ArrowRight":
        commit(width - KEY_STEP)
        break
      case "Home":
        commit(MIN_WIDTH)
        break
      case "End":
        commit(maxWidth())
        break
      case "Enter":
        commit(DEFAULT_WIDTH)
        break
      default:
        return
    }
    event.preventDefault()
  }

  return (
    <div
      aria-label={cartContent.resizeAriaLabel}
      aria-orientation="vertical"
      aria-valuemin={MIN_WIDTH}
      aria-valuenow={width}
      className="group absolute inset-y-0 -left-1.5 z-10 hidden w-3 cursor-col-resize touch-none outline-none lg:block"
      onDoubleClick={() => {
        commit(DEFAULT_WIDTH)
      }}
      onKeyDown={onKeyDown}
      onPointerCancel={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      role="separator"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 rounded-full bg-primary opacity-0 transition-opacity group-hover:opacity-60 group-focus-visible:opacity-100 group-active:opacity-100"
      />
    </div>
  )
}
