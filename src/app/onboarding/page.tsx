import { redirect } from "next/navigation";
import { AuthLayout } from "@/components/auth/auth-layout";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
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

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm/6 text-red-700">{error}</p> : null}

      <form action={createAgencyAction} className="grid gap-6">
        <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
          Agency name
          <input
            required
            name="name"
            minLength={2}
            maxLength={80}
            placeholder="Northstar Automation"
            className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>
        <label className="grid gap-2 text-sm/6 font-medium text-zinc-950">
          Slug
          <input
            name="slug"
            maxLength={80}
            placeholder="northstar-automation"
            className="h-10 rounded-lg border border-zinc-950/10 bg-white px-3 text-sm/6 font-normal text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950/20 focus:ring-2 focus:ring-zinc-950/10"
          />
        </label>
        <FormSubmitButton type="submit" className="w-full" pendingLabel="Creating...">
          Create workspace
        </FormSubmitButton>
      </form>
    </AuthLayout>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
