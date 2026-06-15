import { beforeEach, describe, expect, it, vi } from "vitest";

const sentryLoggerInfo = vi.hoisted(() => vi.fn());

vi.mock("@sentry/nextjs", () => ({
  logger: {
    info: sentryLoggerInfo,
  },
}));

import { GET } from "./route";

const originalEnv = { ...process.env };

describe("Sentry example API route", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env = { ...originalEnv };
    sentryLoggerInfo.mockReset();
  });

  it("stays hidden in production unless the smoke test route is explicitly enabled", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.SENTRY_EXAMPLE_ENABLED;

    const response = GET();

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Not found." });
    expect(sentryLoggerInfo).not.toHaveBeenCalled();
  });

  it("throws the sample backend error for local Sentry verification", () => {
    vi.stubEnv("NODE_ENV", "test");
    delete process.env.SENTRY_EXAMPLE_ENABLED;

    expect(() => GET()).toThrow(
      "This error is raised on the backend called by the example page.",
    );
    expect(sentryLoggerInfo).toHaveBeenCalledWith("Sentry example API called");
  });

  it("can be explicitly enabled for temporary deployed Sentry smoke tests", () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.SENTRY_EXAMPLE_ENABLED = "true";

    expect(() => GET()).toThrow(
      "This error is raised on the backend called by the example page.",
    );
    expect(sentryLoggerInfo).toHaveBeenCalledWith("Sentry example API called");
  });
});
