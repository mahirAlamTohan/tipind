import type { Metadata } from "next"
import { ArrowLeft, Search } from "lucide-react"

import { Container } from "@/components/ui/container"
import { siteConfig } from "@/config/site"

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Page not found",
}

/**
 * Branded 404.
 *
 * Without this file the export fell back to Next's built-in page: it inherited
 * the stylesheet but showed a bare "404 | This page could not be found." with no
 * logo and no way back, which looked broken rather than deliberate. Cloudflare
 * serves this for every unmatched path (`not_found_handling: "404-page"`).
 */
export default function NotFound() {
  return (
    // The root layout already renders SiteHeader, so the brand is on screen;
    // repeating the logo here made the page look like it had two headers.
    <main className="grid min-h-[70dvh] place-items-center bg-linear-to-b from-surface-tint to-background px-4 py-16">
      <Container className="max-w-xl text-center">
        <p className="text-[0.68rem] font-extrabold tracking-[0.12em] text-primary-text uppercase">
          Error 404
        </p>
        <h1 className="mt-3 font-display text-[clamp(2rem,5vw,2.9rem)] leading-tight font-extrabold tracking-[-0.045em] text-ink">
          We couldn&apos;t find that page
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">
          The link may be out of date, or the page may have moved. The full
          product catalog is still one click away.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            href="/#catalog"
          >
            <Search aria-hidden="true" className="size-4" />
            Browse the catalog
          </a>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border px-5 text-sm font-bold text-ink transition-colors hover:bg-primary-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring dark:hover:bg-primary-950"
            href="/"
          >
            <ArrowLeft aria-hidden="true" className="size-4" />
            Back to home
          </a>
        </div>

        <p className="mt-10 text-xs text-muted-foreground">
          Need help finding a product?{" "}
          <a
            className="font-semibold text-primary-text underline underline-offset-4"
            href={siteConfig.contact.emailHref}
          >
            {siteConfig.contact.email}
          </a>
        </p>
      </Container>
    </main>
  )
}
