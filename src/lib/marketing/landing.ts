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
        "Monitor client workflows after launch, catch failures early, and turn Check Run, Issue, and Monthly Report data into calm proof-of-work updates.",
    },
    sections: [
      {
        title: "Built around the MVP loop",
        description:
          "The product stays focused on the operational path agencies need after delivery: Agency, Client, Workflow, Check, Check Run, Issue, and Monthly Report.",
        items: [
          {
            label: "Agency",
            description: "Manage one workspace with tenant-safe client operations.",
          },
          {
            label: "Client",
            description: "Track each client account without turning the app into a CRM.",
          },
          {
            label: "Workflow",
            description: "Capture the endpoint, prompt, model, and QA context that matters.",
          },
          {
            label: "Check Run",
            description: "Log scheduled, manual, or external results with status, latency, and cost.",
          },
          {
            label: "Issue",
            description: "Convert failed checks into clear, resolvable operational work.",
          },
          {
            label: "Monthly Report",
            description: "Summarize health, incidents, resolutions, and evidence for stakeholders.",
          },
        ],
      },
      {
        title: "Design-partner ready workflows",
        description:
          "TuesdayOps helps a small agency prove that launched AI automations are still healthy without exposing sensitive run data.",
        items: [
          {
            label: "Run logging",
            description: "Accept safe external run updates through scoped workflow keys.",
          },
          {
            label: "Report automation",
            description: "Generate monthly report drafts from stored source data.",
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
