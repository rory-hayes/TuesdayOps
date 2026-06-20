import { redirect } from "next/navigation";
import { AgencyOnboardingForm } from "@/components/auth/agency-onboarding-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { PageFeedback } from "@/components/ui/page-feedback";
import { createAgencyAction } from "@/lib/auth/actions";
import { getWorkspaceContext } from "@/lib/auth/workspace";

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const [{ user, workspace }, params] = await Promise.all([getWorkspaceContext(), searchParams]);
  const error = readParam(params.error);

  if (!user) {
    redirect("/sign-in");
  }

  if (workspace) {
    redirect("/");
  }

  return (
    <AuthLayout className="max-w-xl">
      <div>
        <h1 className="text-2xl/8 font-semibold text-zinc-950">Create your agency</h1>
        <p className="mt-2 text-sm/6 text-zinc-500">
          This workspace becomes the tenant boundary for clients, workflows, checks, runs, and issues.
        </p>
      </div>

      <PageFeedback error={error} variant="inline" />

      <AgencyOnboardingForm action={createAgencyAction} />
    </AuthLayout>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
