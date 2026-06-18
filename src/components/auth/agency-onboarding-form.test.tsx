/* @vitest-environment jsdom */

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AgencyOnboardingForm } from "@/components/auth/agency-onboarding-form";

describe("AgencyOnboardingForm", () => {
  it("shows a specific inline error before submitting an empty workspace form", () => {
    const action = vi.fn();

    render(<AgencyOnboardingForm action={action} />);

    fireEvent.submit(screen.getByRole("form", { name: "Create agency workspace" }));

    expect(screen.getByText("Agency name is required.")).toBeTruthy();
    expect(screen.getByLabelText("Agency name").getAttribute("aria-invalid")).toBe("true");
    expect(action).not.toHaveBeenCalled();
  });
});
