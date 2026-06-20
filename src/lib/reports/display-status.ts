import type { ReportStatus } from "@/lib/domain/types";

type ReportCardStatus = {
  label: string;
  variant: "success" | "warning" | "danger" | "muted";
};

export function getReportCardStatus(status: ReportStatus): ReportCardStatus {
  if (status === "sent") {
    return { label: "Sent", variant: "success" };
  }

  if (status === "ready_to_send") {
    return { label: "Ready to send", variant: "warning" };
  }

  if (status === "failed") {
    return { label: "Send failed", variant: "danger" };
  }

  return { label: "In progress", variant: "muted" };
}
