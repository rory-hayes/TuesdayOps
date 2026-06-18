export function buildCheckDisableUpdate() {
  return {
    enabled: false,
  };
}

export function formatCheckConfigValidationError(
  issues: Array<{ path: PropertyKey[]; message: string }>,
): string {
  const messages = issues.map((issue) => {
    const field = String(issue.path[0] ?? "");

    if (field === "name") {
      return "Check name must be 2-120 characters.";
    }

    if (field === "expectedStatus") {
      return "Expected status must be 100-599.";
    }

    if (field === "maxLatencyMs") {
      return "Max latency must be 100-60000 ms.";
    }

    if (field === "timeoutMs") {
      return "Timeout must be 1000-60000 ms.";
    }

    if (field === "responseContains") {
      return "Response text assertion must be 200 or fewer characters.";
    }

    if (field === "jsonFieldPath") {
      return "Required field path must be 120 or fewer characters.";
    }

    if (field === "fieldNotEmptyPath") {
      return "Required non-empty field path must be 120 or fewer characters.";
    }

    if (field === "notContainsValue") {
      return "Must-not-contain assertion must be 200 or fewer characters.";
    }

    if (field === "matchesRegexPattern") {
      return "Regex assertion must be 500 or fewer characters.";
    }

    return issue.message;
  });

  return [...new Set(messages)].join(" ");
}
