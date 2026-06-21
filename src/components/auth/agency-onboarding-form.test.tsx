/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgencyOnboardingForm } from "@/components/auth/agency-onboarding-form";
import { SLUG_NORMALIZATION_HELP } from "@/lib/domain/slug";

describe("AgencyOnboardingForm", () => {
  afterEach(() => cleanup());

  it("shows a specific inline error before submitting an empty workspace form", () => {
    const action = vi.fn();

    render(<AgencyOnboardingForm action={action} />);

    fireEvent.submit(screen.getByRole("form", { name: "Create agency workspace" }));

    expect(screen.getByText("Agency name is required.")).toBeTruthy();
    expect(screen.getByLabelText("Agency name").getAttribute("aria-invalid")).toBe("true");
    expect(action).not.toHaveBeenCalled();
  });

  it("does not block submission when the workspace name is filled", () => {
    const action = vi.fn();

    render(<AgencyOnboardingForm action={action} />);

    fireEvent.change(screen.getByLabelText("Agency name"), {
      target: { value: "QA Agency" },
    });
    fireEvent.submit(screen.getByRole("form", { name: "Create agency workspace" }));

    expect(screen.queryByText("Agency name is required.")).toBeNull();
    expect(screen.getByLabelText("Agency name").getAttribute("aria-invalid")).toBeNull();
  });

  it("clears a required agency name error as soon as the corrected value is valid", () => {
    const action = vi.fn();

    render(<AgencyOnboardingForm action={action} />);

    const form = screen.getByRole("form", { name: "Create agency workspace" });
    const agencyName = screen.getByLabelText("Agency name");

    fireEvent.submit(form);

    expect(screen.getByText("Agency name is required.")).toBeTruthy();
    expect(agencyName.getAttribute("aria-invalid")).toBe("true");
    expect(action).not.toHaveBeenCalled();

    fireEvent.change(agencyName, {
      target: { value: "QA Agency" },
    });

    expect(screen.queryByText("Agency name is required.")).toBeNull();
    expect(agencyName.getAttribute("aria-invalid")).toBeNull();

    fireEvent.submit(form);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it("normalizes manually edited slugs as URL-safe text", () => {
    render(<AgencyOnboardingForm action={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Agency name"), {
      target: { value: "QA Agency" },
    });
    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("qa-agency");

    fireEvent.change(screen.getByLabelText("Slug"), {
      target: { value: "Custom Slug!!" },
    });

    expect((screen.getByLabelText("Slug") as HTMLInputElement).value).toBe("custom-slug");
    expect(screen.getByText("Workspace URL slug:")).toBeTruthy();
    expect(screen.getByText("custom-slug")).toBeTruthy();
  });

  it("explains slug normalization before submission", () => {
    render(<AgencyOnboardingForm action={vi.fn()} />);

    expect(screen.getByText(SLUG_NORMALIZATION_HELP)).toBeTruthy();
    expect(screen.getByLabelText("Slug").getAttribute("aria-describedby")).toBe(
      "agency-slug-help",
    );
  });
});
