import { describe, expect, it } from "vitest";
import {
  CLICKABLE_ROW_INTERACTIVE_SELECTOR,
  shouldIgnoreClickableRowEvent,
} from "@/components/ui/clickable-table-row";

describe("shouldIgnoreClickableRowEvent", () => {
  it("ignores clicks that originate inside an interactive row control", () => {
    const target = {
      closest: (selector: string) => selector === CLICKABLE_ROW_INTERACTIVE_SELECTOR ? {} : null,
    };

    expect(shouldIgnoreClickableRowEvent(target as unknown as EventTarget)).toBe(true);
  });

  it("allows row navigation when the click starts from plain row content", () => {
    const target = {
      closest: () => null,
    };

    expect(shouldIgnoreClickableRowEvent(target as unknown as EventTarget)).toBe(false);
  });

  it("does not ignore clicks just because the clickable row itself has link semantics", () => {
    const row = {};
    const target = {
      closest: (selector: string) => selector === CLICKABLE_ROW_INTERACTIVE_SELECTOR ? row : null,
    };

    expect(
      shouldIgnoreClickableRowEvent(
        target as unknown as EventTarget,
        row as HTMLTableRowElement,
      ),
    ).toBe(false);
  });
});
