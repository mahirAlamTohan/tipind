import type { MetadataRoute } from "next"

import { siteConfig } from "@/config/site"

export const dynamic = "force-static"

/**
 * The site is one catalog page plus the checkout, and the checkout is
 * `noindex`. New public pages belong here as they are added; prices and
 * products are client-side state, not URLs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${siteConfig.url}/`,
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
