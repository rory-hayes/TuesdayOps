/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { EMAIL_FORMAT_ERROR, EMAIL_FORMAT_HELP } from "@/lib/auth/email";
import { EMAIL_VERIFICATION_PENDING_NOTICE } from "@/lib/auth/email-verification";
import SignInPage from "./page";

describe("SignInPage", () => {
  afterEach(() => cleanup());

  it("offers Google OAuth while preserving the email password form", async () => {
    const html = renderToStaticMarkup(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('aria-label="Continue with Google"');
    expect(html).toContain('action="/auth/google"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="source"');
    expect(html).toContain('value="sign-in"');
    expect(html).toContain("or continue with email");
    expect(html).toContain('aria-label="Sign in to Maintain Flow"');
    expect(html).toContain('name="email"');
    expect(html).toContain(EMAIL_FORMAT_HELP);
    expect(html).toContain('name="password"');
    expect(html).toContain("Forgot password?");
  });

  it("shows helpful inline email guidance without rejecting plus addressing or subdomains", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    const email = screen.getByLabelText("Email") as HTMLInputElement;

    expect(screen.getByText(EMAIL_FORMAT_HELP)).toBeTruthy();

    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.submit(screen.getByRole("form", { name: "Sign in to Maintain Flow" }));

    expect(screen.getByText(EMAIL_FORMAT_ERROR)).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(email, { target: { value: "ops+alerts@sub.example.co.uk" } });

    expect(screen.queryByText(EMAIL_FORMAT_ERROR)).toBeNull();
    expect(email.getAttribute("aria-invalid")).toBeNull();
  });

  it("shows the pending email verification notice", async () => {
    const html = renderToStaticMarkup(
      await SignInPage({
        searchParams: Promise.resolve({
          notice: EMAIL_VERIFICATION_PENDING_NOTICE,
        }),
      }),
    );

    expect(html).toContain(EMAIL_VERIFICATION_PENDING_NOTICE);
  });
});
