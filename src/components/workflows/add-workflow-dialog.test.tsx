/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddWorkflowDialog } from "@/components/workflows/add-workflow-dialog";

describe("AddWorkflowDialog", () => {
  afterEach(() => {
    cleanup();
  });

  it("keeps the endpoint URL stable through focus changes and numeric edits", () => {
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
    fireEvent.change(endpointUrlInput, { target: { value: typedUrl } });

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

  it("keeps manual endpoint and health-check fields focused with independent values", () => {
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
    const endpointUrl = getInput(dialog, "Endpoint URL");
    const frequency = getInput(dialog, "Frequency minutes");
    const expectedStatus = getInput(dialog, "Expected status");
    const maxLatency = getInput(dialog, "Max latency ms");
    const timeout = getInput(dialog, "Timeout ms");

    endpointUrl.focus();
    fireEvent.change(endpointUrl, {
      target: { value: "https://example.com/api/health?client=acme&mode=full" },
    });

    expect(document.activeElement).toBe(endpointUrl);
    expect(endpointUrl.value).toBe("https://example.com/api/health?client=acme&mode=full");
    expect(frequency.value).toBe("60");
    expect(expectedStatus.value).toBe("200");
    expect(maxLatency.value).toBe("5000");
    expect(timeout.value).toBe("10000");

    frequency.focus();
    fireEvent.change(frequency, { target: { value: "15" } });
    expectedStatus.focus();
    fireEvent.change(expectedStatus, { target: { value: "202" } });
    maxLatency.focus();
    fireEvent.change(maxLatency, { target: { value: "850" } });
    timeout.focus();
    fireEvent.change(timeout, { target: { value: "12000" } });

    expect(document.activeElement).toBe(timeout);
    expect(endpointUrl.value).toBe("https://example.com/api/health?client=acme&mode=full");
    expect(frequency.value).toBe("15");
    expect(expectedStatus.value).toBe("202");
    expect(maxLatency.value).toBe("850");
    expect(timeout.value).toBe("12000");
  });

  it("keeps Ctrl+A scoped to the active manual input", () => {
    const documentKeydown = vi.fn();
    document.addEventListener("keydown", documentKeydown);

    try {
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
      const endpointUrl = getInput(dialog, "Endpoint URL");
      const frequency = getInput(dialog, "Frequency minutes");

      endpointUrl.focus();
      fireEvent.change(endpointUrl, { target: { value: "https://example.com/api/health" } });
      endpointUrl.setSelectionRange(endpointUrl.value.length, endpointUrl.value.length);
      fireEvent.keyDown(endpointUrl, { key: "a", ctrlKey: true });

      expect(documentKeydown).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(endpointUrl);
      expect(endpointUrl.selectionStart).toBe(0);
      expect(endpointUrl.selectionEnd).toBe(endpointUrl.value.length);
      expect(frequency.value).toBe("60");

      frequency.focus();
      fireEvent.change(frequency, { target: { value: "15" } });
      fireEvent.keyDown(frequency, { key: "a", ctrlKey: true });

      expect(documentKeydown).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(frequency);
      expect(frequency.value).toBe("15");
      expect(endpointUrl.value).toBe("https://example.com/api/health");
    } finally {
      document.removeEventListener("keydown", documentKeydown);
    }
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

    fireEvent.change(within(dialog).getByLabelText("Bearer token"), {
      target: { value: "secret-token" },
    });

    expect(within(dialog).queryByText("Bearer token is required.")).toBeNull();
    expect(within(dialog).getByLabelText("Bearer token").getAttribute("aria-invalid")).toBeNull();
  });

  it("rejects invalid health check ranges before submitting the manual workflow", async () => {
    const createWorkflowAction = vi.fn();

    render(
      <AddWorkflowDialog
        clients={[{ id: "11111111-1111-4111-8111-111111111111", name: "Acme" }]}
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
      target: { value: "https://example.com/api/health" },
    });
    fireEvent.change(within(dialog).getByLabelText("Frequency minutes"), {
      target: { value: "0" },
    });
    fireEvent.change(within(dialog).getByLabelText("Expected status"), {
      target: { value: "999" },
    });
    fireEvent.change(within(dialog).getByLabelText("Max latency ms"), {
      target: { value: "0" },
    });
    fireEvent.change(within(dialog).getByLabelText("Timeout ms"), {
      target: { value: "0" },
    });

    const form = within(dialog).getByRole("form", { name: "Manual workflow setup" });
    fireEvent.submit(form);

    expect(await within(dialog).findByText("Frequency must be 5-10080 minutes.")).toBeTruthy();
    expect(within(dialog).getByText("Expected status must be 100-599.")).toBeTruthy();
    expect(within(dialog).getByText("Max latency must be 100-60000 ms.")).toBeTruthy();
    expect(within(dialog).getByText("Timeout must be 1000-60000 ms.")).toBeTruthy();
    expect(within(dialog).getByLabelText("Frequency minutes").getAttribute("aria-invalid")).toBe("true");
    expect(createWorkflowAction).not.toHaveBeenCalled();
  });
});

function getInput(dialog: HTMLElement, name: string) {
  return within(dialog).getByLabelText(name) as HTMLInputElement;
}
