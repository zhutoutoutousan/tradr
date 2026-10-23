import * as Sentry from "@sentry/nextjs";

export function register() {
  const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  Sentry.init({
    dsn,
    enabled: !!dsn,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
  });
}

export const onRequestError = Sentry.captureRequestError;
