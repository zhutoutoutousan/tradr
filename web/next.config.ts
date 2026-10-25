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
  // Legacy community gallery URLs → Tradili (backward compatible bookmarks).
  async redirects() {
    return [
      { source: "/community", destination: "/tradili", permanent: false },
      { source: "/community/:id", destination: "/tradili/:id", permanent: false },
      { source: "/community/:id/play", destination: "/tradili/:id/play", permanent: false },
    ];
  },
};

// Vercel / docs use SENTRY_AUTH_TOKEN; Cloud Secrets currently store the
// Organization Auth Token as SENTRY_ORG_TOKEN. Accept either so source map
// upload is not silently disabled when only one name is set.
const sentryAuthToken =
  process.env.SENTRY_AUTH_TOKEN || process.env.SENTRY_ORG_TOKEN;

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: sentryAuthToken,
  silent: !process.env.CI,
  sourcemaps: { disable: !sentryAuthToken },
});
