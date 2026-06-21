/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("clears field errors as values are corrected and submits once valid", async () => {
    const action = vi.fn();

    render(<NewClientDialog action={action} />);

    fireEvent.click(screen.getByRole("button", { name: "New client" }));

    const dialog = screen.getByRole("dialog", { name: "New client" });
    const addClientButton = within(dialog).getByRole("button", { name: "Add client" });
    const nameField = within(dialog).getByLabelText("Client name");
    const industryField = within(dialog).getByLabelText("Industry");
    const reportEmailField = within(dialog).getByLabelText("Report email");

    fireEvent.click(addClientButton);

    expect(within(dialog).getByText("Client name is required.")).toBeTruthy();
    expect(within(dialog).getByText("Industry is required.")).toBeTruthy();
    expect(within(dialog).getByText("Report email is required.")).toBeTruthy();
    expect(nameField.getAttribute("aria-invalid")).toBe("true");
    expect(industryField.getAttribute("aria-invalid")).toBe("true");
    expect(reportEmailField.getAttribute("aria-invalid")).toBe("true");
    expect(action).not.toHaveBeenCalled();

    fireEvent.change(nameField, { target: { value: "Acme Retail" } });
    expect(within(dialog).queryByText("Client name is required.")).toBeNull();
    expect(nameField.getAttribute("aria-invalid")).toBeNull();
    expect(within(dialog).getByText("Industry is required.")).toBeTruthy();

    fireEvent.change(industryField, { target: { value: "Retail operations" } });
    expect(within(dialog).queryByText("Industry is required.")).toBeNull();
    expect(industryField.getAttribute("aria-invalid")).toBeNull();

    fireEvent.change(reportEmailField, { target: { value: "reports@acme.example" } });
    expect(within(dialog).queryByText("Report email is required.")).toBeNull();
    expect(reportEmailField.getAttribute("aria-invalid")).toBeNull();

    fireEvent.click(addClientButton);

    await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
  });
});
