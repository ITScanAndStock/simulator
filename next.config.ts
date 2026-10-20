import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the journey tests build and serve without overwriting a build served from .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  experimental: {
    serverActions: {
      // One invoice per request; the scanned invoices measured so far stay under 2 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
