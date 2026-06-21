/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NewClientDialog } from "@/components/clients/new-client-dialog";
import { OPTIONAL_SLUG_HELP, SLUG_FORMAT_MESSAGE } from "@/lib/domain/slug";

describe("NewClientDialog", () => {
  afterEach(() => cleanup());

  it("explains generated and custom slug rules in the editable slug field", () => {
    render(<NewClientDialog action={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New client" }));

    const slugField = screen.getByLabelText("Slug");

    expect(screen.getByText(OPTIONAL_SLUG_HELP)).toBeTruthy();
    expect(slugField.getAttribute("aria-describedby")).toBe("slug-help");
    expect(slugField.getAttribute("title")).toBe(SLUG_FORMAT_MESSAGE);
  });

  it("clears required-field errors as corrected client values become valid", () => {
    render(<NewClientDialog action={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "New client" }));

    const dialog = screen.getByRole("dialog", { name: "New client" });
    const form = within(dialog).getByRole("form", { name: "Create client" });
    const clientName = within(dialog).getByLabelText("Client name");
    const industry = within(dialog).getByLabelText("Industry");
    const reportEmail = within(dialog).getByLabelText("Report email");

    fireEvent.submit(form);

    expect(within(dialog).getByText("Client name is required.")).toBeTruthy();
    expect(within(dialog).getByText("Industry is required.")).toBeTruthy();
    expect(within(dialog).getByText("Report email is required.")).toBeTruthy();
    expect(clientName.getAttribute("aria-invalid")).toBe("true");
    expect(industry.getAttribute("aria-invalid")).toBe("true");
    expect(reportEmail.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(clientName, { target: { value: "Acme Support" } });
    fireEvent.change(industry, { target: { value: "Operations" } });
    fireEvent.change(reportEmail, { target: { value: "reports@example.com" } });

    expect(within(dialog).queryByText("Client name is required.")).toBeNull();
    expect(within(dialog).queryByText("Industry is required.")).toBeNull();
    expect(within(dialog).queryByText("Report email is required.")).toBeNull();
    expect(clientName.getAttribute("aria-invalid")).toBeNull();
    expect(industry.getAttribute("aria-invalid")).toBeNull();
    expect(reportEmail.getAttribute("aria-invalid")).toBeNull();
  });
});
