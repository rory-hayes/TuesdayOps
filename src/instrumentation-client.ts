// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = Number.parseFloat(
  process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === "production" ? "0.1" : "1"),
);
const replaysOnErrorSampleRate = Number.parseFloat(
  process.env.NEXT_PUBLIC_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ??
    (process.env.NODE_ENV === "production" ? "0.25" : "1"),
);

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  tracesSampleRate,
  enableLogs: true,

  // Do not record ordinary sessions by default. Capture sampled replays only when an error occurs.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate,

  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
