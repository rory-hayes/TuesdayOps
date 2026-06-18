/* @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";

describe("AddWorkflowDialog", () => {
  it("shows a specific inline error when auth is selected without a secret", async () => {
    const createWorkflowAction = vi.fn();

    render(
      <AddWorkflowDialog
        clients={[{ id: "client-1", name: "Acme" }]}
        createWorkflowAction={createWorkflowAction}
        createWorkflowFromImportAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "Manual setup" }));

    const dialog = screen.getByRole("dialog", { name: "Add workflow" });
    fireEvent.change(within(dialog).getByLabelText("Workflow name"), {
      target: { value: "Lead intake" },
    });
    fireEvent.change(within(dialog).getByLabelText("Endpoint URL"), {
      target: { value: "https://example.com/api/health?client=acme&mode=full" },
    });
    fireEvent.change(within(dialog).getByLabelText("Auth"), {
      target: { value: "bearer" },
    });

    const form = within(dialog).getByRole("form", { name: "Manual workflow setup" });
    fireEvent.submit(form);

    expect(await within(dialog).findByText("Bearer token is required.")).toBeTruthy();
    expect(within(dialog).getByLabelText("Bearer token").getAttribute("aria-invalid")).toBe("true");
    expect(createWorkflowAction).not.toHaveBeenCalled();
  });
});
