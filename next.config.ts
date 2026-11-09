import type { NextConfig } from "next"

/**
 * Dev-only: Next blocks cross-origin requests to the dev server unless the
 * requesting host is listed. localhost is always allowed; add your LAN IPs or
 * tunnel hosts with NEXT_ALLOWED_DEV_ORIGINS="192.168.1.20,my-tunnel.example".
 */
const allowedDevOrigins = [
  "*.e2b.app", // hosted preview proxy used by the Arena sandbox
  ...(process.env.NEXT_ALLOWED_DEV_ORIGINS?.split(",") ?? [])
    .map((origin) => origin.trim())
    .filter(Boolean),
]

const nextConfig: NextConfig = {
  // Fully static site: `next build` writes ./out, deployed as Cloudflare assets.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins,
  reactCompiler: true,
}

export default nextConfig
