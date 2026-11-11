"use client"

import { siteContent } from "@/config/content"
import { siteConfig } from "@/config/site"

/**
 * Last-resort boundary: the root layout itself failed, so this replaces the
 * whole document. Inline styles only — anything shared could be the broken
 * thing.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const copy = siteContent.ui

  return (
    <html lang="en">
      <body
        style={{
          alignItems: "center",
          background: "#f8fafc",
          color: "#0f172a",
          display: "flex",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          justifyContent: "center",
          margin: 0,
          minHeight: "100vh",
          padding: "2rem",
        }}
      >
        <main style={{ maxWidth: "32rem", textAlign: "center" }}>
          <p
            style={{
              color: "#1d4ed8",
              fontSize: "0.7rem",
              fontWeight: 800,
              letterSpacing: "0.12em",
              margin: "0 0 0.75rem",
              textTransform: "uppercase",
            }}
          >
            {siteConfig.name}
          </p>
          <h1
            style={{
              fontSize: "clamp(1.6rem, 5vw, 2.2rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.15,
              margin: 0,
            }}
          >
            {copy.errorTitle}
          </h1>
          <p
            style={{
              color: "#475569",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              margin: "0.75rem 0 0",
            }}
          >
            {copy.errorDescription}
          </p>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              justifyContent: "center",
              marginTop: "1.75rem",
            }}
          >
            <button
              onClick={reset}
              style={{
                background: "#2563eb",
                border: 0,
                borderRadius: "999px",
                color: "#ffffff",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 600,
                padding: "0.65rem 1.25rem",
              }}
              type="button"
            >
              {copy.errorRetry}
            </button>
            {/* A full page load is deliberate: the router may be what failed. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "999px",
                color: "#0f172a",
                fontSize: "0.875rem",
                fontWeight: 600,
                padding: "0.65rem 1.25rem",
                textDecoration: "none",
              }}
            >
              {copy.errorHome}
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
