/* @vitest-environment jsdom */

import type { FormEvent } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FieldError, ValidatedForm } from "@/components/ui/validated-form";

describe("ValidatedForm", () => {
  afterEach(() => cleanup());

  it("clears stale field errors on input and submits on the first corrected submit", () => {
    const onSubmit = vi.fn((event: FormEvent<HTMLFormElement>) => event.preventDefault());

    render(
      <ValidatedForm aria-label="Create project" onSubmit={onSubmit}>
        <label>
          Project name
          <input required name="name" aria-label="Project name" data-field-label="Project name" />
          <FieldError name="name" />
        </label>
        <button type="submit">Create</button>
      </ValidatedForm>,
    );

    const form = screen.getByRole("form", { name: "Create project" });
    const name = screen.getByLabelText("Project name");

    fireEvent.submit(form);

    expect(screen.getByText("Project name is required.")).toBeTruthy();
    expect(name.getAttribute("aria-invalid")).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();

    fireEvent.change(name, { target: { value: "QA Project" } });

    expect(screen.queryByText("Project name is required.")).toBeNull();
    expect(name.getAttribute("aria-invalid")).toBeNull();

    fireEvent.submit(form);

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("clears stale select errors on change", () => {
    render(
      <ValidatedForm aria-label="Assign client">
        <label>
          Client
          <select required name="clientId" aria-label="Client" defaultValue="" data-field-label="Client">
            <option value="">Select a client</option>
            <option value="client-1">Acme</option>
          </select>
          <FieldError name="clientId" />
        </label>
        <button type="submit">Assign</button>
      </ValidatedForm>,
    );

    const form = screen.getByRole("form", { name: "Assign client" });
    const client = screen.getByLabelText("Client");

    fireEvent.submit(form);

    expect(screen.getByText("Client is required.")).toBeTruthy();
    expect(client.getAttribute("aria-invalid")).toBe("true");

    fireEvent.change(client, { target: { value: "client-1" } });

    expect(screen.queryByText("Client is required.")).toBeNull();
    expect(client.getAttribute("aria-invalid")).toBeNull();
  });
});
