/* @vitest-environment jsdom */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SignInPage from "./page";

describe("SignInPage", () => {
  it("offers Google OAuth while preserving the email password form", async () => {
    const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('aria-label="Continue with Google"');
    expect(html).toContain('name="source"');
    expect(html).toContain('value="sign-in"');
    expect(html).toContain("or continue with email");
    expect(html).toContain('aria-label="Sign in to Tuesday"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="password"');
    expect(html).toContain("Forgot password?");
  });
});
