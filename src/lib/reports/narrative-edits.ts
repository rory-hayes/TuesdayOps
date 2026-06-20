import { sanitizeReportText } from "@/lib/reports/sanitize";

export type ReportNarrativeEditField = "summary" | "recommendations" | "itemTitle" | "itemBody";

export type PreparedReportNarrativeEdit =
  | {
      target: "report";
      auditField: "summary";
      updates: {
        summary: string;
      };
    }
  | {
      target: "report";
      auditField: "recommendations";
      updates: {
        recommendations_json: string[];
      };
    }
  | {
      target: "item";
      auditField: "item_title";
      updates: {
        title: string;
      };
    }
  | {
      target: "item";
      auditField: "item_body";
      updates: {
        body: string;
      };
    };

export function prepareReportNarrativeEdit({
  field,
  value,
}: {
  field: ReportNarrativeEditField;
  value: string;
}): PreparedReportNarrativeEdit {
  if (field === "recommendations") {
    return {
      target: "report",
      auditField: "recommendations",
      updates: {
        recommendations_json: normalizeRecommendations(value),
      },
    };
  }

  const sanitized = sanitizeReportText(value);

  if (!sanitized) {
    throw new Error(getEmptyCopyMessage(field));
  }

  if (field === "summary") {
    return {
      target: "report",
      auditField: "summary",
      updates: {
        summary: sanitized,
      },
    };
  }

  if (field === "itemTitle") {
    return {
      target: "item",
      auditField: "item_title",
      updates: {
        title: sanitized,
      },
    };
  }

  return {
    target: "item",
    auditField: "item_body",
    updates: {
      body: sanitized,
    },
  };
}

function normalizeRecommendations(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => sanitizeReportText(item))
    .filter(Boolean)
    .slice(0, 8);
}

function getEmptyCopyMessage(field: Exclude<ReportNarrativeEditField, "recommendations">) {
  if (field === "summary") {
    return "Report summary cannot be empty.";
  }

  if (field === "itemTitle") {
    return "Report item title cannot be empty.";
  }

  return "Report item body cannot be empty.";
}
