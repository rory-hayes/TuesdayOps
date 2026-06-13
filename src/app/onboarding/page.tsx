import { redirect } from "next/navigation";
import { Activity } from "lucide-react";
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
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <section className="w-full max-w-xl rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity size={20} aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-semibold">TuesdayOps</p>
            <p className="text-xs text-muted-foreground">Workspace setup</p>
          </div>
        </div>

        <div className="mt-8">
          <p className="text-sm font-medium text-primary">Agency workspace</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-normal">Create your agency</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            This workspace becomes the tenant boundary for clients, workflows, checks, runs, and issues.
          </p>
        </div>

        {error ? <p className="mt-5 rounded-md bg-danger-background p-3 text-sm text-danger">{error}</p> : null}

        <form action={createAgencyAction} className="mt-6 grid gap-4">
          <label className="block text-sm font-medium">
            Agency name
            <input
              required
              name="name"
              minLength={2}
              maxLength={80}
              placeholder="Northstar Automation"
              className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <label className="block text-sm font-medium">
            Slug
            <input
              name="slug"
              maxLength={80}
              placeholder="northstar-automation"
              className="mt-2 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary"
            />
          </label>
          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-md border border-primary bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-[#6d5ee0]"
          >
            Create workspace
          </button>
        </form>
      </section>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
