import type { CheckRunStatus, IssueStatus, TestRunStatus, WorkflowStatus } from "@/lib/domain/types";
import { Badge } from "@/components/ui/badge";

type StatusBadgeProps = {
  status:
    | WorkflowStatus
    | IssueStatus
    | CheckRunStatus
    | TestRunStatus
    | "ready_to_send"
    | "draft"
    | "sent"
    | "not_run";
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status.replaceAll("_", " ");

  if (
    status === "healthy" ||
    status === "passed" ||
    status === "resolved" ||
    status === "sent" ||
    status === "ready_to_send"
  ) {
    return <Badge variant="success">{label}</Badge>;
  }

  if (status === "degraded" || status === "in_review" || status === "draft") {
    return <Badge variant="warning">{label}</Badge>;
  }

  if (status === "failed" || status === "open") {
    return <Badge variant="danger">{label}</Badge>;
  }

  return <Badge variant="muted">{label}</Badge>;
}
