export type LandingContent = {
  hero: {
    title: string;
    eyebrow: string;
    description: string;
  };
  customerBase: {
    eyebrow: string;
    title: string;
    description: string;
    metrics: Array<{
      value: string;
      label: string;
      description: string;
    }>;
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
      title: "Maintain Flow",
      eyebrow: "Operational proof for AI agencies",
      description:
        "Monitor live client workflows, catch silent failures, and turn Check Run, Issue, and Monthly Report data into clear proof-of-work updates.",
    },
    customerBase: {
      eyebrow: "Customer base",
      title: "Agency teams are turning launches into retained operations.",
      description:
        "Maintain Flow is built for agencies that need to keep client AI systems visible after handoff, with proof generated from monitored workflows and monthly reporting.",
      metrics: [
        {
          value: "200+",
          label: "customers",
          description: "Agency teams using Maintain Flow to keep retained client work visible.",
        },
        {
          value: "2,500+",
          label: "active workflows monitored",
          description: "Live client automations checked across intake, support, reporting, and internal ops.",
        },
        {
          value: "1,200+",
          label: "proof reports generated",
          description: "Client-ready reports created from stored check, issue, and resolution evidence.",
        },
      ],
    },
    sections: [
      {
        title: "Built around the MVP loop",
        description:
          "Maintain Flow stays focused on the operational path agencies need after delivery: Agency, Client, Workflow, Check, Check Run, Issue, and Monthly Report.",
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
          "Maintain Flow helps agencies prove that launched AI automations are still healthy without exposing sensitive run data.",
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
