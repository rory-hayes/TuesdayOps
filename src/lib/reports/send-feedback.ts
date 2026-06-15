export function buildReportSendRedirect({
  reportId,
  status,
  message,
}: {
  reportId: string;
  status: "sent" | "failed";
  message?: string;
}) {
  if (status === "failed") {
    return `/reports/${reportId}?error=${encodeURIComponent(message ?? "Report email could not be sent.")}`;
  }

  return `/reports/${reportId}?notice=${encodeURIComponent("Report email sent.")}`;
}
