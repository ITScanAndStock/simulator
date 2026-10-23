import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the journey tests build and serve without overwriting a build served from .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  // A native module, and a worker and language data loaded from their own folder at run time.
  serverExternalPackages: [
    "@napi-rs/canvas",
    "tesseract.js",
    "@tesseract.js-data/fra",
  ],
  experimental: {
    serverActions: {
      // One invoice per request; the scanned invoices measured so far stay under 2 MB.
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
