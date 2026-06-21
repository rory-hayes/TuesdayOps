/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import SignUpPage from "./page";

describe("SignUpPage", () => {
  afterEach(() => cleanup());

  it("asks users to confirm a stronger password with accessible requirements", async () => {
    const html = renderToStaticMarkup(await SignUpPage({ searchParams: Promise.resolve({}) }));

    expect(html).toContain('aria-label="Continue with Google"');
    expect(html).toContain('action="/auth/google"');
    expect(html).toContain('method="get"');
    expect(html).toContain('name="source"');
    expect(html).toContain('value="sign-up"');
    expect(html).toContain("or continue with email");
    expect(html).toContain('aria-label="Create Maintain Flow account"');
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
    fireEvent.submit(screen.getByRole("form", { name: "Create Maintain Flow account" }));

    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(
      screen.getByText("Use at least 12 characters with uppercase, lowercase, number, and symbol."),
    ).toBeTruthy();
    expect(screen.getByText("Password and confirmation must match.")).toBeTruthy();
    expect(email.value).toBe("not-an-email");
    expect(password.value).toBe("short");
    expect(confirmPassword.value).toBe("different");
  });

  it("updates inline sign-up validation as touched fields change before submit", async () => {
    render(await SignUpPage({ searchParams: Promise.resolve({}) }));

    const email = screen.getByLabelText("Email") as HTMLInputElement;
    const password = screen.getByLabelText("New password") as HTMLInputElement;
    const confirmPassword = screen.getByLabelText("Confirm password") as HTMLInputElement;

    fireEvent.change(email, { target: { value: "not-an-email" } });
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();

    fireEvent.change(email, { target: { value: "owner@example.com" } });
    expect(screen.queryByText("Enter a valid email address.")).toBeNull();

    fireEvent.change(password, { target: { value: "short" } });
    expect(
      screen
        .getAllByRole("alert")
        .some(
          (alert) =>
            alert.textContent ===
            "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
        ),
    ).toBeTruthy();

    fireEvent.change(password, { target: { value: "Tuesday-2026!" } });
    expect(
      screen
        .queryAllByRole("alert")
        .some(
          (alert) =>
            alert.textContent ===
            "Use at least 12 characters with uppercase, lowercase, number, and symbol.",
        ),
    ).toBe(false);

    fireEvent.change(confirmPassword, { target: { value: "Tuesday-2027!" } });
    expect(screen.getByText("Password and confirmation must match.")).toBeTruthy();

    fireEvent.change(confirmPassword, { target: { value: "Tuesday-2026!" } });
    expect(screen.queryByText("Password and confirmation must match.")).toBeNull();
    expect(email.value).toBe("owner@example.com");
    expect(password.value).toBe("Tuesday-2026!");
    expect(confirmPassword.value).toBe("Tuesday-2026!");
  });

  it("lets users reveal and hide sign-up password fields", async () => {
    render(await SignUpPage({ searchParams: Promise.resolve({}) }));

    const password = screen.getByLabelText("New password") as HTMLInputElement;
    const confirmPassword = screen.getByLabelText("Confirm password") as HTMLInputElement;

    expect(password.type).toBe("password");
    expect(confirmPassword.type).toBe("password");

    const showButtons = screen.getAllByRole("button", { name: "Show entered characters" });
    fireEvent.click(showButtons[0]);
    fireEvent.click(showButtons[1]);

    expect(password.type).toBe("text");
    expect(confirmPassword.type).toBe("text");

    const hideButtons = screen.getAllByRole("button", { name: "Hide entered characters" });
    fireEvent.click(hideButtons[0]);
    fireEvent.click(hideButtons[1]);

    expect(password.type).toBe("password");
    expect(confirmPassword.type).toBe("password");
  });
});
