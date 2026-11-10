"use client"

import { Component, type ErrorInfo, type ReactNode } from "react"

interface ErrorBoundaryProps {
  children: ReactNode
  /** Rendered instead of the subtree once a descendant throws. */
  fallback: (reset: () => void) => ReactNode
  /** Names the surface in the console report ("catalog", "cart", …). */
  label: string
}

interface ErrorBoundaryState {
  failed: boolean
}

/**
 * Catches render errors in a subtree so one broken island cannot blank the
 * whole page. Route files (`app/error.tsx`, `app/global-error.tsx`) catch
 * whole-segment failures; this is for the parts that should fail on their own.
 *
 * It does NOT catch errors thrown in event handlers, timers or promises —
 * those are handled where they happen (see docs/engineering/error-handling.md).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Console only: no network, no PII. A hosting platform's log drain is the
    // place for this if one is ever added.
    console.error(`[tipind] ${this.props.label} failed to render`, {
      error,
      componentStack: info.componentStack,
    })
  }

  reset = () => {
    this.setState({ failed: false })
  }

  render() {
    return this.state.failed
      ? this.props.fallback(this.reset)
      : this.props.children
  }
}
