import { afterEach, describe, expect, it } from "vitest";
import { getAppUrl } from "./env";

const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

describe("getAppUrl", () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("falls back to localhost when no app URL is configured", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;

    expect(getAppUrl()).toBe("http://localhost:3000");
  });

  it("requires an absolute http URL when app URL is configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "tuesday-ops.vercel.app";

    expect(() => getAppUrl()).toThrow("Invalid NEXT_PUBLIC_APP_URL");
  });
});
