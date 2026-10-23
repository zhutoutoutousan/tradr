import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // Always revalidate HTML documents so phones never run a stale cached build
  // of the multiplayer pages during pilot testing. Hashed JS/CSS chunks under
  // /_next/static stay long-cached as usual (excluded below).
  async headers() {
    return [
      {
        source: "/((?!_next/static|_next/image|sw\\.js|manifest\\.json).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
});
