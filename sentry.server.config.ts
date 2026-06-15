// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const tracesSampleRate = Number.parseFloat(
  process.env.SENTRY_TRACES_SAMPLE_RATE ?? (process.env.NODE_ENV === "production" ? "0.1" : "1"),
);

Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,

  tracesSampleRate,

  // Keep log capture enabled, but do not enable default PII collection.
  enableLogs: true,
  sendDefaultPii: false,
});
