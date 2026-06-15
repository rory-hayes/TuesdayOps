import { notFound } from "next/navigation";
import { SentryExampleClient } from "@/app/sentry-example-page/sentry-example-client";

export const dynamic = "force-dynamic";

export default function SentryExamplePage() {
  if (!isSentryExampleEnabled()) {
    notFound();
  }

  return <SentryExampleClient />;
}

function isSentryExampleEnabled() {
  return process.env.NODE_ENV !== "production" || process.env.SENTRY_EXAMPLE_ENABLED === "true";
}
