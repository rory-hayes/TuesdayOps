import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SignUpPage from "./page";

describe("SignUpPage", () => {
  it("asks users to confirm a stronger password with accessible requirements", async () => {
    const html = renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('aria-label="Create TuesdayOps account"');
    expect(html).toContain("noValidate");
    expect(html).toContain('name="password"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).toContain(
      "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    );
  });
});
