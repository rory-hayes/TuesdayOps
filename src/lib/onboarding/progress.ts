import type { TuesdayOpsSeedData } from "@/lib/domain/types";

export type OnboardingStepId = "agency" | "client" | "workflow" | "check_run" | "report";

export type OnboardingStep = {
  id: OnboardingStepId;
  label: string;
  detail: string;
  href: string;
  complete: boolean;
};

export type OnboardingProgress = {
  steps: OnboardingStep[];
  completedCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
  nextStep?: OnboardingStep;
};

export function buildOnboardingProgress(data: TuesdayOpsSeedData): OnboardingProgress {
  const activeClients = data.clients.filter((client) => !client.archived);
  const steps: OnboardingStep[] = [
    {
      id: "agency",
      label: "Create agency",
      detail: data.agency.name,
      href: "/settings",
      complete: true,
    },
    {
      id: "client",
      label: "Add first client",
      detail: activeClients.length ? activeClients[0].name : "Start with one retained client",
      href: "/clients",
      complete: activeClients.length > 0,
    },
    {
      id: "workflow",
      label: "Add first workflow",
      detail: data.workflows.length ? data.workflows[0].name : "Connect one live endpoint",
      href: "/workflows",
      complete: data.workflows.length > 0,
    },
    {
      id: "check_run",
      label: "Run first check",
      detail: data.checkRuns.length ? "Check history is being stored" : "Run the health check once",
      href: data.workflows[0] ? `/workflows/${data.workflows[0].id}` : "/workflows",
      complete: data.checkRuns.length > 0,
    },
    {
      id: "report",
      label: "Create sample report",
      detail: data.reports.length ? data.reports[0].periodLabel : "Generate proof for the current month",
      href: "/reports",
      complete: data.reports.length > 0,
    },
  ];
  const completedCount = steps.filter((step) => step.complete).length;
  const totalCount = steps.length;

  return {
    steps,
    completedCount,
    totalCount,
    percent: Math.round((completedCount / totalCount) * 100),
    complete: completedCount === totalCount,
    nextStep: steps.find((step) => !step.complete),
  };
}
