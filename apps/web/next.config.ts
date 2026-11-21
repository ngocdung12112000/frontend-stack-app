import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // @stackshop/ui ships TypeScript source. Turbopack transpiles workspace packages
  // automatically; listing it keeps other bundlers consistent.
  transpilePackages: ["@stackshop/ui"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
