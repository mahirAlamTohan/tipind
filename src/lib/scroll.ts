import type { MouseEvent } from "react"

/** Matches `scroll-pt-32` on <html> (8rem). */
const SCROLL_OFFSET = 128
const HOME_ID = "home"

/**
 * Handles in-page nav clicks ourselves instead of leaving it to next/link.
 * Each call starts a fresh `window.scrollTo`, which interrupts any smooth
 * scroll already running, so rapid clicks always follow the latest target.
 *
 * `behavior: "auto"` defers to the CSS `scroll-behavior` (smooth, or
 * instant when the user prefers reduced motion).
 *
 * Returns without doing anything (so Link navigates normally) when we're
 * not on the home page, on modified clicks, or if the target is missing.
 */
export function scrollToSection(event: MouseEvent<HTMLElement>, id: string) {
  if (window.location.pathname !== "/") return
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) {
    return
  }

  const element = document.getElementById(id)
  if (!element && id !== HOME_ID) return

  event.preventDefault()

  // Home goes to the true top, not to the #home anchor a few px below it.
  const top =
    id === HOME_ID || !element
      ? 0
      : Math.max(
          0,
          element.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET
        )

  window.scrollTo({ top, behavior: "auto" })
  window.history.replaceState(null, "", id === HOME_ID ? "/" : `/#${id}`)
}
