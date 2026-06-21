import type { IssueSeverity } from "@/lib/domain/types";

export type IssueAlertPolicyInput = {
  created: boolean;
  severity: IssueSeverity;
};

export type IssueAlertEmailInput = {
  issue: {
    id: string;
    severity: IssueSeverity;
    title: string;
    description: string;
    suggestedAction: string;
  };
  clientName: string;
  workflowName: string;
  checkName: string;
  appUrl: string;
};

export type IssueAlertEmail = {
  subject: string;
  text: string;
  html: string;
};

export function shouldSendIssueAlert({ created, severity }: IssueAlertPolicyInput): boolean {
  return created && (severity === "high" || severity === "critical");
}

export function buildIssueAlertEmail({
  issue,
  clientName,
  workflowName,
  checkName,
  appUrl,
}: IssueAlertEmailInput): IssueAlertEmail {
  const safeClientName = redactAlertText(clientName);
  const safeWorkflowName = redactAlertText(workflowName);
  const safeCheckName = redactAlertText(checkName);
  const safeTitle = redactAlertText(issue.title);
  const safeDescription = redactAlertText(issue.description);
  const safeSuggestedAction = redactAlertText(issue.suggestedAction);
  const severityLabel = issue.severity === "critical" ? "Critical" : "High";
  const issuesUrl = `${appUrl.replace(/\/$/, "")}/issues`;

  return {
    subject: `[Maintain Flow] ${severityLabel} issue for ${safeClientName}: ${safeTitle}`,
    text: [
      `${severityLabel} severity issue detected in Maintain Flow.`,
      "",
      `Client: ${safeClientName}`,
      `Workflow: ${safeWorkflowName}`,
      `Check: ${safeCheckName}`,
      `Severity: ${issue.severity}`,
      "",
      `Issue: ${safeTitle}`,
      safeDescription,
      "",
      `Suggested action: ${safeSuggestedAction}`,
      "",
      `Open Maintain Flow: ${issuesUrl}`,
    ].join("\n"),
    html: [
      `<p><strong>${escapeHtml(severityLabel)} severity issue detected in Maintain Flow.</strong></p>`,
      "<ul>",
      `<li><strong>Client:</strong> ${escapeHtml(safeClientName)}</li>`,
      `<li><strong>Workflow:</strong> ${escapeHtml(safeWorkflowName)}</li>`,
      `<li><strong>Check:</strong> ${escapeHtml(safeCheckName)}</li>`,
      `<li><strong>Severity:</strong> ${escapeHtml(issue.severity)}</li>`,
      "</ul>",
      `<p><strong>Issue:</strong> ${escapeHtml(safeTitle)}</p>`,
      `<p>${escapeHtml(safeDescription)}</p>`,
      `<p><strong>Suggested action:</strong> ${escapeHtml(safeSuggestedAction)}</p>`,
      `<p><a href="${escapeHtml(issuesUrl)}">Open Maintain Flow issue queue</a></p>`,
    ].join(""),
  };
}

export function redactAlertText(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/Basic\s+[A-Za-z0-9+/=-]+/gi, "Basic [redacted]")
    .replace(/"?(api[_-]?key|token|secret|password)"?\s*[:=]\s*"[^"]+"/gi, '"$1":"[redacted]"')
    .replace(/\b(api[_-]?key|token|secret|password)=\S+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
