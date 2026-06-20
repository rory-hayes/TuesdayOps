export type LandingContent = {
  hero: {
    title: string;
    eyebrow: string;
    description: string;
  };
  sections: Array<{
    title: string;
    description: string;
    items: Array<{
      label: string;
      description: string;
    }>;
  }>;
};

export function getLandingContent(): LandingContent {
  return {
    hero: {
      title: "TuesdayOps",
      eyebrow: "Operational proof for AI agencies",
      description:
        "Monitor live client workflows, turn failed checks into accountable issues, and generate monthly proof-of-work reports from stored operational evidence.",
    },
    sections: [
      {
        title: "Built around the MVP loop",
        description:
          "TuesdayOps stays focused on the operating path agencies need after delivery: Agency, Client, Workflow, Check, Check Run, Issue, and Monthly Report.",
        items: [
          {
            label: "Agency",
            description: "Run one tenant-safe workspace for client workflow maintenance.",
          },
          {
            label: "Client",
            description: "Keep each retained client connected to workflows, issues, and reports.",
          },
          {
            label: "Workflow",
            description: "Register the endpoint, run-log, model, and QA context that matters.",
          },
          {
            label: "Check Run",
            description: "Store scheduled, manual, or external results with status and latency.",
          },
          {
            label: "Issue",
            description: "Convert failures into deduped, resolvable operational work.",
          },
          {
            label: "Monthly Report",
            description: "Summarize health, incidents, resolutions, and proof for stakeholders.",
          },
        ],
      },
      {
        title: "Design-partner ready workflows",
        description:
          "TuesdayOps helps agencies prove that launched AI automations are still healthy without exposing sensitive run data.",
        items: [
          {
            label: "Run logging",
            description: "Accept external run updates through scoped workflow keys.",
          },
          {
            label: "Report automation",
            description: "Generate monthly report drafts from stored evidence.",
          },
          {
            label: "Change validation",
            description: "Compare prompt and model versions before the next client update.",
          },
        ],
      },
    ],
  };
}
