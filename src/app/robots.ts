import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"

/** Static export: generated once at build time, like the rest of the site. */
export const dynamic = "force-static"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // The checkout holds whatever the buyer typed.
        disallow: "/checkout/",
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  }
}
