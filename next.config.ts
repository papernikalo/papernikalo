import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  async redirects() {
    return [
      { source: "/tools/typing", destination: "/typing", permanent: true },
      { source: "/typing-test", destination: "/typing", permanent: true },
      { source: "/tools/typing/progress", destination: "/progress", permanent: true },
      { source: "/practice", destination: "/steno", permanent: true },
      { source: "/steno-practice", destination: "/steno", permanent: true },
      { source: "/shipping", destination: "/contact", permanent: true },
      { source: "/subscribe", destination: "/services", permanent: true },
      { source: "/pricing", destination: "/services", permanent: true },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
