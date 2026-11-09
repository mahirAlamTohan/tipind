"use client"

import type { MouseEvent } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"

import { Button } from "@/components/ui/button"
import { siteContent } from "@/config/content"
import { cn } from "@/lib/utils"

interface ThemeToggleProps {
  className?: string
}

const REVEAL_DURATION_MS = 550
const REVEAL_EASING = "cubic-bezier(0.4, 0, 0.2, 1)"

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

/** Expands the new theme as a circle from the clicked button. */
function revealFrom(button: HTMLElement, transition: ViewTransition) {
  const rect = button.getBoundingClientRect()
  const x = rect.left + rect.width / 2
  const y = rect.top + rect.height / 2
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )
  const origin = `${x.toFixed(0)}px ${y.toFixed(0)}px`

  void transition.ready.then(() => {
    document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${origin})`,
          `circle(${radius.toFixed(0)}px at ${origin})`,
        ],
      },
      {
        duration: REVEAL_DURATION_MS,
        easing: REVEAL_EASING,
        pseudoElement: "::view-transition-new(root)",
      }
    )
  })
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    const next = resolvedTheme === "dark" ? "light" : "dark"

    if (
      prefersReducedMotion() ||
      typeof document.startViewTransition !== "function"
    ) {
      setTheme(next)
      return
    }

    const transition = document.startViewTransition(() => {
      // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- View Transitions need the DOM updated synchronously
      flushSync(() => {
        setTheme(next)
      })
    })

    revealFrom(event.currentTarget, transition)
  }

  return (
    <Button
      aria-label={siteContent.ui.themeToggleLabel}
      className={cn("shrink-0", className)}
      onClick={toggle}
      size="icon"
      title={siteContent.ui.themeToggleLabel}
      type="button"
      variant="ghost"
    >
      <Moon aria-hidden="true" className="dark:hidden" />
      <Sun aria-hidden="true" className="hidden dark:block" />
      <span className="sr-only">{siteContent.ui.themeToggleLabel}</span>
    </Button>
  )
}
