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
      title: "Keep every client workflow running.",
      eyebrow: "Operational proof for AI agencies",
      description:
        "The post-launch operating layer for AI agencies. Monitor the automations you ship, catch silent failures before clients notice, and turn the work you do into monthly proof.",
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
        title: "A maintenance loop your agency can actually run.",
        description:
          "Maintain Flow keeps the post-launch path simple: connect each client workflow, monitor Check Runs, resolve Issues, and send Monthly Reports from stored evidence.",
        items: [
          {
            label: "Connect",
            description: "Add the client, register the workflow, and keep credentials tenant-scoped.",
          },
          {
            label: "Monitor",
            description: "Run scheduled or manual checks with status, latency, and report-ready context.",
          },
          {
            label: "Catch",
            description: "Surface failed checks, schema drift, expired keys, and stalled runs before clients escalate.",
          },
          {
            label: "Resolve",
            description: "Turn failures into owned Issues with severity, notes, and resolution history.",
          },
          {
            label: "Report",
            description: "Generate Monthly Reports with checks, incidents, fixes, and proof clients can understand.",
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
