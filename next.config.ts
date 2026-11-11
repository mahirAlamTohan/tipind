import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  allowedDevOrigins: ["192.168.0.198", "10.2.0.2"],
  reactCompiler: true,
}

export default nextConfig
