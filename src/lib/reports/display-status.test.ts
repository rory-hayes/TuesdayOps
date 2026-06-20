import { describe, expect, it } from "vitest";
import { getReportCardStatus } from "@/lib/reports/display-status";

describe("getReportCardStatus", () => {
  it("maps report states to client-facing card labels", () => {
    expect(getReportCardStatus("sent")).toEqual({ label: "Sent", variant: "success" });
    expect(getReportCardStatus("draft")).toEqual({ label: "In progress", variant: "muted" });
    expect(getReportCardStatus("ready_to_send")).toEqual({ label: "Ready to send", variant: "warning" });
    expect(getReportCardStatus("failed")).toEqual({ label: "Send failed", variant: "danger" });
  });
});
