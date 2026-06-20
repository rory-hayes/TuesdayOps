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
      title: "Tuesday",
      eyebrow: "Operational proof for AI agencies",
      description:
        "Monitor live client workflows, catch silent failures, and turn Check Run, Issue, and Monthly Report data into clear proof-of-work updates.",
    },
    customerBase: {
      eyebrow: "Customer base",
      title: "Agency teams are turning launches into retained operations.",
      description:
        "Tuesday is built for agencies that need to keep client AI systems visible after handoff, with proof generated from monitored workflows and monthly reporting.",
      metrics: [
        {
          value: "200+",
          label: "customers",
          description: "Agency teams using Tuesday to keep retained client work visible.",
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
        title: "How it works",
        description:
          "Tuesday turns routine workflow maintenance into a simple operating path your team can repeat for every retained client.",
        items: [
          {
            label: "Connect workflow endpoint",
            description: "Register the client workflow, endpoint, auth context, and owner in one workspace.",
          },
          {
            label: "Run health checks",
            description: "Schedule checks and accept run logs so failures, latency, and regressions stay visible.",
          },
          {
            label: "Create issues",
            description: "Convert failed checks into deduped issues with severity, owner, and client context.",
          },
          {
            label: "Resolve maintenance work",
            description: "Track fixes, notes, and resolution summaries without losing the operational evidence.",
          },
          {
            label: "Send proof report",
            description: "Package monitored workflows, caught issues, completed fixes, and next-month recommendations.",
          },
        ],
      },
      {
        title: "Design-partner ready workflows",
        description:
          "Tuesday helps agencies prove that launched AI automations are still healthy without exposing sensitive run data.",
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
