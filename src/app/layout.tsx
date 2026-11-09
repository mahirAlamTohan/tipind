import type { Metadata, Viewport } from "next"
import localFont from "next/font/local"

import { siteConfig } from "@/config/site"

import "@/styles/main.css"

import { SiteHeader } from "@/components/layout/header"
import { OfflineStatus } from "@/components/layout/offline-status"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { CartRoot } from "@/features/cart/components/cart-root"

const bodyFont = localFont({
  display: "swap",
  src: "../fonts/manrope-latin-normal.woff2",
  variable: "--font-body",
  weight: "200 800",
})

const headingFont = localFont({
  display: "swap",
  src: "../fonts/dm-sans-latin-normal.woff2",
  variable: "--font-heading",
  weight: "100 1000",
})

const pageTitle = `${siteConfig.name} | ${siteConfig.tagline}`
const socialDescription =
  "Quality medicines support better healthcare. Browse the pharmaceutical catalog or contact our team for ordering assistance."
const socialImageAlt = `${siteConfig.name} — quality medicines for better healthcare`

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
}

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: pageTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    siteConfig.name,
    "pharmaceutical catalog",
    "generic medicines",
    "healthcare supply",
  ],
  applicationName: siteConfig.name,
  manifest: "/manifest.webmanifest",
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    title: siteConfig.name,
    statusBarStyle: "default",
  },
  // Icons come from the file conventions (app/icon.tsx, app/apple-icon.tsx)
  // so the generated pill artwork is what every platform picks up.
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: siteConfig.name,
    title: pageTitle,
    description: socialDescription,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: socialImageAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: pageTitle,
    description: socialDescription,
    images: ["/opengraph-image"],
  },
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      className={`${bodyFont.variable} ${headingFont.variable} min-w-80 scroll-pt-32 scroll-smooth motion-reduce:scroll-auto`}
      data-scroll-behavior="smooth"
      lang="en"
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased selection:bg-primary-200 selection:text-ink">
        <ThemeProvider>
          <TooltipProvider>
            <OfflineStatus />
            <SiteHeader />
            {children}
            <Toaster className="hidden lg:block" />
            <CartRoot />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
