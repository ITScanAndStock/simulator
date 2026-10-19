import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets the journey tests build and serve without overwriting a build served from .next.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
};

export default nextConfig;
