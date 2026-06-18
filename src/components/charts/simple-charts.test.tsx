/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MiniLineChart } from "@/components/charts/simple-charts";

describe("MiniLineChart", () => {
  afterEach(() => cleanup());

  it("renders accessible point tooltips with labels and values", () => {
    const { container } = render(
      <MiniLineChart
        label="Pass-rate trend"
        suffix="%"
        points={[
          { label: "Jun 16", value: 92 },
          { label: "Jun 17", value: 86 },
        ]}
      />,
    );

    expect(screen.getByText("Latest 86%")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jun 16: 92%" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Jun 17: 86%" })).toBeTruthy();
    expect(container.querySelector('path[stroke="rgb(39,39,42)"]')).toBeTruthy();
  });
});
