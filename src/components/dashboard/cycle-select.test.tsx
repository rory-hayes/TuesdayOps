import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CycleSelect, reportCycleOptions } from "@/components/dashboard/cycle-select";

describe("CycleSelect", () => {
  it("renders the dashboard cycle control without a native select menu", () => {
    const html = renderToStaticMarkup(<CycleSelect />);

    expect(html).toContain("June cycle");
    expect(html).not.toContain("<select");
    expect(reportCycleOptions.map((option) => option.label)).toEqual([
      "June cycle",
      "May cycle",
      "Last quarter",
    ]);
  });
});
