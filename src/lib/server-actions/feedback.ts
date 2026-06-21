const INTERNAL_ERROR_PATTERNS = [
  /duplicate key/i,
  /violates .*constraint/i,
  /foreign key/i,
  /\bRLS\b/i,
  /row-level security/i,
  /\bPGRST\d+\b/i,
  /\b\d{5}\b/,
  /\bSQLSTATE\b/i,
  /\b[A-Za-z0-9]+_[A-Za-z0-9_]*_(?:key|fkey|idx|check)\b/,
];

const SAFE_EXACT_MESSAGES = new Set([
  "Add at least one test case before running this pack.",
  "Check run did not return a workflow.",
  "Client was not found or is not accessible.",
  "Issue was not found or is not accessible.",
  "Private or local workflow endpoints are blocked in production.",
  "Report is blocked until readiness issues are resolved.",
  "Test pack is disabled.",
  "Workflow was not found or is not accessible.",
]);

export function formatActionError(error: unknown, fallback = "We could not complete that action. Review the details and try again."): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const message = error.message.trim();

  if (!message) {
    return fallback;
  }

  if (isSafeReportBlockerMessage(message)) {
    return message.replace(/^Report is blocked: /, "Report needs more source data: ");
  }

  if (SAFE_EXACT_MESSAGES.has(message) || isSafeUpgradeMessage(message)) {
    return message;
  }

  if (INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))) {
    return fallback;
  }

  return redactSensitiveFragments(message).slice(0, 240);
}

function isSafeUpgradeMessage(message: string): boolean {
  return /^Upgrade to (add|monitor) more (clients|workflows)\.$/.test(message);
}

function isSafeReportBlockerMessage(message: string): boolean {
  return /^Report is blocked: .+/.test(message);
}

function redactSensitiveFragments(message: string): string {
  return message
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[redacted-email]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\b(?:sk|rk|pk)_(?:test|live)_[A-Za-z0-9_]+/g, "[redacted-key]")
    .replace(/(api[_-]?key|token|secret|password)\s*[:=]\s*[^,\s)]+/gi, "$1=[redacted]");
}
