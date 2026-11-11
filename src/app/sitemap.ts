import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"

export const dynamic = "force-static"

/**
 * One page, one entry. `/checkout` is deliberately excluded: it is marked
 * `robots: { index: false }` and has no content without a cart.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: siteConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
