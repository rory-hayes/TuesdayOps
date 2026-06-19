/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import SignUpPage from "./page";

describe("SignUpPage", () => {
  afterEach(() => cleanup());

  it("asks users to confirm a stronger password with accessible requirements", async () => {
    const html = renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('aria-label="Create TuesdayOps account"');
    expect(html).toContain("noValidate");
    expect(html).toContain("New password");
    expect(html).toContain('name="password"');
    expect(html).toContain('name="confirmPassword"');
    expect(html).toContain(
      "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
    );
  });

  it("shows inline validation while preserving invalid sign-up values", async () => {
    render(await SignUpPage({ searchParams: Promise.resolve({}) }));

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    const password = screen.getByLabelText("New password") as HTMLInputElement;
    const confirmPassword = screen.getByLabelText("Confirm password") as HTMLInputElement;

    fireEvent.change(email, { target: { value: "not-an-email" } });
    fireEvent.change(password, { target: { value: "short" } });
    fireEvent.change(confirmPassword, { target: { value: "different" } });
    fireEvent.submit(screen.getByRole("form", { name: "Create TuesdayOps account" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Use at least 12 characters with uppercase, lowercase, number, and symbol."),
    ).toBeTruthy();
    expect(screen.getByText("Password and confirmation must match.")).toBeTruthy();
    expect(email.value).toBe("not-an-email");
    expect(password.value).toBe("short");
    expect(confirmPassword.value).toBe("different");
  });

  it("lets users reveal and hide sign-up password fields", async () => {
    render(await SignUpPage({ searchParams: Promise.resolve({}) }));

    const password = screen.getByLabelText("New password") as HTMLInputElement;
    const confirmPassword = screen.getByLabelText("Confirm password") as HTMLInputElement;

    expect(password.type).toBe("password");
    expect(confirmPassword.type).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Show new password" }));
    fireEvent.click(screen.getByRole("button", { name: "Show confirmed password" }));

    expect(password.type).toBe("text");
    expect(confirmPassword.type).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Hide new password" }));
    fireEvent.click(screen.getByRole("button", { name: "Hide confirmed password" }));

    expect(password.type).toBe("password");
    expect(confirmPassword.type).toBe("password");
  });
});
