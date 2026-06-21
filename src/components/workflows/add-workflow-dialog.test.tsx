/* @vitest-environment jsdom */

import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";

describe("AddWorkflowDialog", () => {
  it("keeps the endpoint URL stable through typing, focus changes, and numeric edits", async () => {
    render(
      <AddWorkflowDialog
        clients={[{ id: "client-1", name: "Acme" }]}
        createWorkflowAction={vi.fn()}
        createWorkflowFromImportAction={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Add workflow" }));
    fireEvent.click(screen.getByRole("button", { name: "Manual setup" }));

    const dialog = screen.getByRole("dialog", { name: "Add workflow" });
    const endpointUrlInput = within(dialog).getByLabelText("Endpoint URL") as HTMLInputElement;
    const frequencyInput = within(dialog).getByLabelText("Frequency minutes") as HTMLInputElement;
    const typedUrl = "https://example.com/api/health?client=acme&mode=full#ready";

    endpointUrlInput.focus();
    await typeCharacters(endpointUrlInput, typedUrl);

    expect(endpointUrlInput.value).toBe(typedUrl);
    expect(document.activeElement).toBe(endpointUrlInput);

    fireEvent.blur(endpointUrlInput);
    frequencyInput.focus();
    fireEvent.change(frequencyInput, { target: { value: "15" } });

    expect(frequencyInput.value).toBe("15");
    expect(endpointUrlInput.value).toBe(typedUrl);

    endpointUrlInput.focus();

    expect(document.activeElement).toBe(endpointUrlInput);
    expect(endpointUrlInput.value).toBe(typedUrl);
  });

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

async function typeCharacters(input: HTMLInputElement, value: string) {
  for (const character of value) {
    fireEvent.input(input, { target: { value: `${input.value}${character}` } });
    await Promise.resolve();
  }
}
