/* @vitest-environment jsdom */

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MiniBarChart, MiniLineChart } from "@/components/charts/simple-charts";

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

  it("gives the line chart image a data-rich accessible name", () => {
    render(
      <MiniLineChart
        label="Pass-rate trend"
        suffix="%"
        points={[
          { label: "Jun 16", value: 92 },
          { label: "Jun 17", value: 86 },
        ]}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "Pass-rate trend chart. Jun 16: 92%. Jun 17: 86%. Latest 86%.",
      }),
    ).toBeTruthy();
  });
});

describe("MiniBarChart", () => {
  afterEach(() => cleanup());

  it("exposes bar chart values as an accessible image name", () => {
    render(
      <MiniBarChart
        label="Open issues by severity"
        tone="risk"
        points={[
          { label: "High", value: 3 },
          { label: "Critical", value: 1 },
        ]}
      />,
    );

    expect(
      screen.getByRole("img", {
        name: "Open issues by severity chart. High: 3. Critical: 1. Latest 1.",
      }),
    ).toBeTruthy();
  });
});
