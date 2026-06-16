export function buildWorkflowArchiveUpdate(archivedAt = new Date().toISOString()) {
  return {
    archived_at: archivedAt,
    included_in_reports: false,
  };
}
