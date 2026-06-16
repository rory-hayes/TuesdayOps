export function buildTestPackUpdate({
  name,
  description,
}: {
  name: string;
  description?: string;
}) {
  return {
    name,
    description: description ?? "",
  };
}

export function buildTestPackDisableUpdate() {
  return {
    enabled: false,
  };
}

export function buildTestCaseUpdate({
  name,
  inputJson,
  assertionsJson,
}: {
  name: string;
  inputJson: unknown;
  assertionsJson: unknown;
}) {
  return {
    name,
    input_json: inputJson,
    assertions_json: assertionsJson,
  };
}

export function buildTestCaseArchiveUpdate(archivedAt = new Date().toISOString()) {
  return {
    archived_at: archivedAt,
  };
}
