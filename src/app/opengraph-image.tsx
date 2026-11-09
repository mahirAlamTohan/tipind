import { ImageResponse } from "next/og"

import { siteConfig } from "@/config/site"
import {
  BRAND_SURFACE_GRADIENT,
  BRAND_TILE_GRADIENT,
  PILL_PATHS,
} from "@/lib/brand-image"

export const alt = `${siteConfig.name} — quality medicines for better healthcare`
export const size = {
  width: 1200,
  height: 630,
}
export const contentType = "image/png"
export const dynamic = "force-static"

/** Only the brand mark: the same pill glyph as the logo, on its tile. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        alignItems: "center",
        background: BRAND_SURFACE_GRADIENT,
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div
        style={{
          alignItems: "center",
          background: BRAND_TILE_GRADIENT,
          borderRadius: 76,
          display: "flex",
          height: 300,
          justifyContent: "center",
          width: 300,
        }}
      >
        <svg height={176} viewBox="0 0 24 24" width={176}>
          <path
            d={PILL_PATHS.body}
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
          />
          <path
            d={PILL_PATHS.seam}
            fill="none"
            stroke="#ffffff"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2.2}
          />
        </svg>
      </div>
    </div>,
    size
  )
}
