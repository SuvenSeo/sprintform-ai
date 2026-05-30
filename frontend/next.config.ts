import type { NextConfig } from "next";

const localApiDestination = process.env.NEXT_PUBLIC_API_BASE_URL ?? (process.env.VERCEL ? null : "http://127.0.0.1:8001");

const nextConfig: NextConfig = {
  async rewrites() {
    if (!localApiDestination) return [];
    return [{ source: "/api/:path*", destination: `${localApiDestination}/api/:path*` }];
  },
};

export default nextConfig;
