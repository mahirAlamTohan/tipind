import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"

export const dynamic = "force-static"

/**
 * The catalog is a business asset, so nothing is blocked here — blocking a
 * catalogue site from crawlers only hurts discovery. `/checkout` is a
 * client-only flow with no indexable content.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/checkout/", "/api/"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  }
}
