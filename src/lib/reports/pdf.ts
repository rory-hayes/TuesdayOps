import type { ReportDraft } from "@/lib/domain/types";

export function renderReportPdfBytes(report: ReportDraft): Buffer {
  const lines = buildPdfLines(report);
  const content = [
    "BT",
    "/F1 18 Tf",
    "50 780 Td",
    `(${escapePdfText(`${report.clientName} ${report.periodLabel} Report`)}) Tj`,
    "/F1 11 Tf",
    "0 -26 Td",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
  ];
  const chunks = ["%PDF-1.4\n"];
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(chunks.join(""), "latin1"));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(chunks.join(""), "latin1");
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push("0000000000 65535 f \n");

  for (const offset of offsets.slice(1)) {
    chunks.push(`${offset.toString().padStart(10, "0")} 00000 n \n`);
  }

  chunks.push(
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  );

  return Buffer.from(chunks.join(""), "latin1");
}

export function buildReportEmail({
  report,
  downloadUrl,
}: {
  report: ReportDraft;
  downloadUrl: string;
}) {
  const subject = `${report.clientName} ${report.periodLabel} maintenance report`;
  const text = [
    subject,
    "",
    sanitizeReportText(report.summary),
    "",
    `Download: ${downloadUrl}`,
  ].join("\n");
  const html = `
    <div>
      <h1>${escapeHtml(subject)}</h1>
      <p>${escapeHtml(sanitizeReportText(report.summary))}</p>
      <p><a href="${escapeHtml(downloadUrl)}">Download the PDF report</a></p>
    </div>
  `;

  return { subject, text, html };
}

function buildPdfLines(report: ReportDraft): string[] {
  return [
    sanitizeReportText(report.summary),
    "",
    `Workflows monitored: ${report.metrics.workflowsMonitored}`,
    `Checks run: ${report.metrics.checksRun}`,
    `Check pass rate: ${report.metrics.passRate}%`,
    `Issues caught: ${report.metrics.issuesCaught}`,
    `Issues resolved: ${report.metrics.issuesResolved}`,
    `Synthetic runs: ${report.metrics.testRuns}`,
    `Synthetic failures: ${report.metrics.testFailures}`,
    "",
    "Report sections",
    ...report.items.flatMap((item) => [
      sanitizeReportText(item.title),
      sanitizeReportText(item.body),
    ]),
    "",
    "Recommendations",
    ...report.recommendations.map(sanitizeReportText),
  ]
    .flatMap(wrapLine)
    .slice(0, 44);
}

function wrapLine(line: string): string[] {
  if (!line) {
    return [""];
  }

  const output: string[] = [];
  let remaining = line;

  while (remaining.length > 88) {
    output.push(remaining.slice(0, 88));
    remaining = remaining.slice(88);
  }

  output.push(remaining);
  return output;
}

function sanitizeReportText(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]")
    .replace(/\s+/g, " ")
    .trim();
}

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
