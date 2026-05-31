import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Always revalidate HTML documents so phones never run a stale cached build
  // of the multiplayer pages during pilot testing. Hashed JS/CSS chunks under
  // /_next/static stay long-cached as usual (excluded below).
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
