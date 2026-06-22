const appUrl = normalizeAppUrl(process.env.PRODUCTION_SMOKE_URL ?? "https://www.maintainflow.io");
const expectedRelease = process.env.EXPECTED_PRODUCTION_RELEASE?.trim();
const timeoutSeconds = Number.parseInt(process.env.PRODUCTION_RELEASE_TIMEOUT_SECONDS ?? "900", 10);
const intervalSeconds = Number.parseInt(process.env.PRODUCTION_RELEASE_POLL_SECONDS ?? "10", 10);

if (!expectedRelease) {
  console.log("No EXPECTED_PRODUCTION_RELEASE set; skipping production release wait.");
  process.exit(0);
}

const deadline = Date.now() + timeoutSeconds * 1000;
let lastObservedRelease = "none";

while (Date.now() < deadline) {
  try {
    const response = await fetch(`${appUrl}/sign-in`, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
    });
    const body = await response.text();
    lastObservedRelease = readSentryRelease(body) ?? `HTTP ${response.status} without sentry release`;

    if (lastObservedRelease === expectedRelease) {
      console.log(`Production is serving expected release ${expectedRelease}.`);
      process.exit(0);
    }

    console.log(`Waiting for ${expectedRelease}; observed ${lastObservedRelease}.`);
  } catch (error) {
    console.log(`Release wait request failed: ${formatUnknownError(error)}.`);
  }

  await sleep(intervalSeconds * 1000);
}

console.error(
  `Timed out waiting for ${appUrl} to serve ${expectedRelease}; last observed ${lastObservedRelease}.`,
);
process.exit(1);

function normalizeAppUrl(value) {
  const parsedUrl = new URL(value);

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("PRODUCTION_SMOKE_URL must use http or https.");
  }

  return parsedUrl.origin;
}

function readSentryRelease(body) {
  return body.match(/\bsentry-release=([a-f0-9]{40})\b/)?.[1];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatUnknownError(error) {
  return error instanceof Error ? error.message : "Unknown error";
}
