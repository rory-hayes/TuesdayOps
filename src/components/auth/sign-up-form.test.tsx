/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SignUpForm } from "@/components/auth/sign-up-form";
import { EMAIL_FORMAT_ERROR, EMAIL_FORMAT_HELP } from "@/lib/auth/email";
import { PASSWORD_REQUIREMENTS } from "@/lib/auth/password";

describe("SignUpForm", () => {
  afterEach(() => cleanup());

  it("guides invalid emails and accepts plus addressing with subdomains", () => {
    render(<SignUpForm action={vi.fn()} />);

    const email = screen.getByLabelText("Email") as HTMLInputElement;

    expect(screen.getByText(EMAIL_FORMAT_HELP)).toBeTruthy();

    fireEvent.change(email, { target: { value: "not-an-email" } });

    expect(screen.getByText(EMAIL_FORMAT_ERROR)).toBeTruthy();
    expect(email.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(email, { target: { value: "ops+alerts@sub.example.co.uk" } });

    expect(screen.queryByText(EMAIL_FORMAT_ERROR)).toBeNull();
    expect(email.getAttribute("aria-invalid")).toBeNull();
  });

  it("shows inline accessible validation for weak and mismatched passwords", async () => {
    const action = vi.fn();

    render(<SignUpForm action={action} />);

    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ops@example.com" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "weak" } });
    fireEvent.submit(screen.getByRole("form", { name: "Create Maintain Flow account" }));

    expect(screen.getByRole("alert").textContent).toContain(PASSWORD_REQUIREMENTS);
    expect(action).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "Tuesday-2026!" } });
    fireEvent.change(screen.getByLabelText("Confirm password"), { target: { value: "Tuesday-2027!" } });

    await waitFor(() => {
      expect(screen.getByText("Password and confirmation must match.")).toBeTruthy();
    });

    fireEvent.submit(screen.getByRole("form", { name: "Create Maintain Flow account" }));

    expect(screen.getByRole("alert").textContent).toContain("Password and confirmation must match.");
    expect(action).not.toHaveBeenCalled();
  });

  it("lets users reveal and hide password fields", () => {
    render(<SignUpForm action={vi.fn()} />);

    const password = screen.getByLabelText("New password");
    expect(password.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getAllByRole("button", { name: "Show entered characters" })[0]);

    expect(password.getAttribute("type")).toBe("text");

    fireEvent.click(screen.getAllByRole("button", { name: "Hide entered characters" })[0]);

    expect(password.getAttribute("type")).toBe("password");
  });
});
