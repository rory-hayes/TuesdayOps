/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
});
