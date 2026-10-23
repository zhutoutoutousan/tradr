import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  integrations: [Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false })],
});

if (dsn && typeof window !== "undefined") {
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  Sentry.setTag("pwa_standalone", standalone ? "yes" : "no");
  Sentry.setTag("sw_controlled", navigator.serviceWorker?.controller ? "yes" : "no");

  // Report pages that keep reloading themselves (e.g. a service worker update loop).
  try {
    const key = "sentry-reload-times";
    const now = Date.now();
    const recent = (JSON.parse(sessionStorage.getItem(key) ?? "[]") as number[]).filter((t) => now - t < 30000);
    recent.push(now);
    sessionStorage.setItem(key, JSON.stringify(recent));
    if (recent.length > 5) {
      Sentry.captureMessage(`Page reloaded ${recent.length} times in 30s`, {
        level: "error",
        tags: { reload_loop: "yes" },
      });
      sessionStorage.setItem(key, "[]");
    }
  } catch {
    // sessionStorage unavailable (private mode)
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
