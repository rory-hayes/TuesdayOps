/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JsonTextArea } from "@/components/ui/json-textarea";

describe("JsonTextArea", () => {
  afterEach(() => cleanup());

  it("shows a visible inline validation error for malformed JSON", () => {
    render(<JsonTextArea aria-label="Input JSON" name="inputJson" />);

    const textarea = screen.getByLabelText("Input JSON") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "{not-json" } });

    expect(screen.getByRole("alert").textContent).toBe("Enter valid JSON or leave this field blank.");
    expect(textarea.getAttribute("aria-invalid")).toBe("true");
    expect(textarea.validationMessage).toBe("Enter valid JSON or leave this field blank.");
  });

  it("clears the inline validation error once JSON is valid", () => {
    render(<JsonTextArea aria-label="Input JSON" name="inputJson" />);

    const textarea = screen.getByLabelText("Input JSON") as HTMLTextAreaElement;
    fireEvent.input(textarea, { target: { value: "{not-json" } });
    fireEvent.input(textarea, { target: { value: "{\"ok\":true}" } });

    expect(screen.queryByRole("alert")).toBeNull();
    expect(textarea.getAttribute("aria-invalid")).toBeNull();
    expect(textarea.validationMessage).toBe("");
  });
});
