import type { ReportQuality, ReportQualityCheck } from "@/lib/reports/quality";

type ResolutionAction =
  | {
      type: "link";
      label: string;
      href: string;
    }
  | {
      type: "regenerate";
      label: string;
    };

export type ReportReadinessResolutionItem = ReportQualityCheck & {
  guidance: string;
  actions: ResolutionAction[];
};

export function buildReportReadinessResolutionItems({
  quality,
  clientId,
}: {
  quality: ReportQuality;
  clientId: string;
}): ReportReadinessResolutionItem[] {
  return quality.checks
    .filter((check) => check.status !== "ready")
    .map((check) => ({
      ...check,
      ...getResolutionPlan(check.id, clientId),
    }));
}

function getResolutionPlan(
  checkId: ReportQualityCheck["id"],
  clientId: string,
): Pick<ReportReadinessResolutionItem, "guidance" | "actions"> {
  if (checkId === "source_data") {
    return {
      guidance: "Run or log at least one check for this client in the report period, then regenerate the report.",
      actions: [
        { type: "link", label: "Open checks", href: "/checks" },
        { type: "link", label: "Open workflows", href: "/workflows" },
      ],
    };
  }

  if (checkId === "sections") {
    return {
      guidance: "Regenerate this report to rebuild the saved client-facing sections from stored source data.",
      actions: [{ type: "regenerate", label: "Regenerate report" }],
    };
  }

  if (checkId === "recommendations") {
    return {
      guidance: "Regenerate the report after maintenance notes or issue updates so recommendations are refreshed.",
      actions: [{ type: "regenerate", label: "Regenerate report" }],
    };
  }

  return {
    guidance: "Resolve, snooze, or exclude high-risk client issues before treating the report as fully ready.",
    actions: [
      {
        type: "link",
        label: "Open client issues",
        href: `/issues?clientId=${encodeURIComponent(clientId)}&status=all`,
      },
    ],
  };
}
